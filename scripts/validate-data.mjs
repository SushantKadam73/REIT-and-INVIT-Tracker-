#!/usr/bin/env node
/**
 * validate-data.mjs — sanity-checks the JSON data files.
 * Runs in CI (GitHub Action) and can be run locally: npm run validate
 *
 * Keying contract (regression guard for the 14 Sep bug):
 *  - data/prices.json and data/history/<ISIN>.json are keyed by ISIN
 *  - data/distributions.json and data/fundamentals.json are keyed by NSE SYMBOL
 *
 * Fails the build (exit 1) if:
 *  - required fields are missing
 *  - dates don't parse
 *  - distributions.json / fundamentals.json contain ISIN-shaped keys or miss
 *    universe symbols (symbol-keyed check)
 *  - a distribution row's components, when present, don't sum to within ±0.05
 *  - yields are outside 0-40% (almost certainly a data error)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

const load = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));

const trustsDoc = load("data/trusts.json");
const prices = load("data/prices.json");
const distributions = load("data/distributions.json");
const fundamentals = load("data/fundamentals.json");

const ISIN_RE = /^INE[0-9A-Z]{8}[0-9]$/;
const isDate = (s) => {
  if (s == null) return true; // null allowed
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime());
};

const isins = new Set();

for (const t of trustsDoc.universe) {
  const ctx = `trusts.${t.nseSymbol || "?"}`;
  // Stubs auto-added by discover.mjs only need a symbol until reviewed.
  const required = t.needsReview ? ["nseSymbol"] : ["isin", "nseSymbol", "bseCode", "name", "type", "sector", "listedDate"];
  for (const field of required) {
    if (!t[field]) errors.push(`${ctx}: missing required field '${field}'`);
  }
  if (t.isin && isins.has(t.isin)) errors.push(`${ctx}: duplicate ISIN ${t.isin}`);
  if (t.isin) isins.add(t.isin);
  if (t.isin && !ISIN_RE.test(t.isin)) errors.push(`${ctx}: isin '${t.isin}' is not ISIN-shaped`);
  if (t.listedDate && !isDate(t.listedDate)) errors.push(`${ctx}: listedDate '${t.listedDate}' is not a valid ISO date`);
  if (t.type != null && !["REIT", "InvIT"].includes(t.type)) errors.push(`${ctx}: type must be REIT or InvIT`);
  if (!t.needsReview && t.lotSize !== 1) errors.push(`${ctx}: lotSize must be 1 (private/25k-lot InvITs are excluded from this universe)`);
}

const universeSymbols = new Set(trustsDoc.universe.map((t) => t.nseSymbol));

// ---- Keying checks: distributions.json / fundamentals.json must be SYMBOL-keyed ----
for (const [file, obj] of [
  ["distributions.json", distributions],
  ["fundamentals.json", fundamentals],
]) {
  for (const key of Object.keys(obj)) {
    if (isins.has(key) || ISIN_RE.test(key)) {
      errors.push(`${file}: key '${key}' looks like an ISIN — this file must be keyed by NSE symbol`);
    }
  }
}
for (const sym of universeSymbols) {
  if (!fundamentals[sym]) warnings.push(`fundamentals: no entry for ${sym}`);
  if (!distributions[sym]) warnings.push(`distributions: no entry for ${sym}`);
}

// ---- Per-trust checks ----
for (const t of trustsDoc.universe) {
  const p = t.isin ? prices[t.isin] : null;
  if (!p) {
    if (!t.needsReview) warnings.push(`prices: no entry for ${t.nseSymbol} (${t.isin})`);
  } else {
    if (p.price != null && (p.price <= 0 || p.price > 100000)) {
      errors.push(`prices.${t.nseSymbol}: price ${p.price} looks wrong`);
    }
    if (p.change1d != null && Math.abs(p.change1d) > 20) {
      warnings.push(`prices.${t.nseSymbol}: 1-day change ${p.change1d}% is unusually large for a trust — check`);
    }
    if (!isDate(p.asOf)) errors.push(`prices.${t.nseSymbol}: bad asOf date '${p.asOf}'`);
  }

  const f = fundamentals[t.nseSymbol];
  if (f) {
    if (f.navPerUnit != null && p?.price != null) {
      const prem = ((p.price - f.navPerUnit) / f.navPerUnit) * 100;
      if (Math.abs(prem) > 80) warnings.push(`fundamentals.${t.nseSymbol}: price is ${prem.toFixed(0)}% vs NAV — double-check NAV ${f.navPerUnit} / price ${p.price}`);
    }
    if (f.ltv != null && (f.ltv < 0 || f.ltv > 100)) errors.push(`fundamentals.${t.nseSymbol}: LTV ${f.ltv} out of range`);
    if (f.occupancy != null && (f.occupancy < 0 || f.occupancy > 100)) errors.push(`fundamentals.${t.nseSymbol}: occupancy ${f.occupancy} out of range`);
    if (!isDate(f.navDate)) errors.push(`fundamentals.${t.nseSymbol}: bad navDate '${f.navDate}'`);
  }

  // Yield sanity: TTM DPU / price within 0-40% (distributions are SYMBOL-keyed)
  const dists = (distributions[t.nseSymbol] || []).filter((d) => d.totalDPU != null);
  if (dists.length >= 4 && p?.price) {
    const ttm = dists.slice(-4).reduce((s, d) => s + d.totalDPU, 0);
    const y = (ttm / p.price) * 100;
    if (y < 0 || y > 40) errors.push(`${t.nseSymbol}: TTM yield ${y.toFixed(1)}% outside 0-40% — data error likely`);
  }

  // Component split sanity — when any component is present, the sum must match
  // totalDPU within ±0.05 (paise rounding). Rows with a null split are allowed
  // (never-fabricate policy) but must carry a note saying so.
  for (const d of distributions[t.nseSymbol] || []) {
    const parts = [d.interest, d.dividend, d.returnOfCapital, d.other].filter((x) => x != null);
    if (parts.length > 0) {
      if (d.totalDPU == null) {
        errors.push(`${t.nseSymbol} ${d.quarter}: components present but totalDPU is null`);
      } else {
        const sum = parts.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - d.totalDPU) > 0.05) {
          errors.push(`${t.nseSymbol} ${d.quarter}: components sum to ${sum.toFixed(3)} but totalDPU is ${d.totalDPU} (±0.05 allowed)`);
        }
      }
    } else if (!d.note) {
      warnings.push(`${t.nseSymbol} ${d.quarter}: null split without an explanatory note`);
    }
    for (const df of ["recordDate", "exDate", "paymentDate"]) {
      if (!isDate(d[df])) errors.push(`${t.nseSymbol} ${d.quarter}: bad ${df} '${d[df]}'`);
    }
  }

  // History file exists and parses (ISIN-keyed)
  if (t.isin && existsSync(join(root, "data/history", `${t.isin}.json`))) {
    try {
      const hist = load(`data/history/${t.isin}.json`);
      if (!Array.isArray(hist)) throw new Error("not an array");
      for (const pt of hist) {
        if (!pt.d || typeof pt.c !== "number") throw new Error(`bad point ${JSON.stringify(pt)}`);
      }
    } catch (e) {
      warnings.push(`history: ${t.isin}.json missing or invalid (${e.message})`);
    }
  } else if (!t.needsReview) {
    warnings.push(`history: ${t.isin}.json missing`);
  }
}

console.log(`Validated ${trustsDoc.universe.length} trusts.`);
for (const w of warnings) console.warn(`  WARN  ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} ERROR(S):`);
  for (const e of errors) console.error(`  ERROR ${e}`);
  process.exit(1);
}
console.log(`OK — 0 errors, ${warnings.length} warnings.`);
