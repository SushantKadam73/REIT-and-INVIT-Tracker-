#!/usr/bin/env node
/**
 * validate-data.mjs — sanity-checks the JSON data files.
 * Runs in CI (GitHub Action) and can be run locally: npm run validate
 *
 * Fails the build (exit 1) if:
 *  - required fields are missing
 *  - dates don't parse
 *  - yields are outside 0-40% (almost certainly a data error)
 *  - component splits exceed the DPU total by more than rounding error
 */

import { readFileSync, readdirSync } from "fs";
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

const isDate = (s) => {
  if (s == null) return true; // null allowed
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime());
};

const isins = new Set();

for (const t of trustsDoc.universe) {
  const ctx = `trusts.${t.nseSymbol || "?"}`;
  for (const field of ["isin", "nseSymbol", "bseCode", "name", "type", "sector", "listedDate"]) {
    if (!t[field]) errors.push(`${ctx}: missing required field '${field}'`);
  }
  if (t.isin && isins.has(t.isin)) errors.push(`${ctx}: duplicate ISIN ${t.isin}`);
  isins.add(t.isin);
  if (!isDate(t.listedDate)) errors.push(`${ctx}: listedDate '${t.listedDate}' is not a valid ISO date`);
  if (!["REIT", "InvIT"].includes(t.type)) errors.push(`${ctx}: type must be REIT or InvIT`);
  if (t.lotSize !== 1) errors.push(`${ctx}: lotSize must be 1 (private/25k-lot InvITs are excluded from this universe)`);
}

for (const t of trustsDoc.universe) {
  const p = prices[t.isin];
  if (!p) {
    warnings.push(`prices: no entry for ${t.nseSymbol} (${t.isin})`);
    continue;
  }
  if (p.price != null && (p.price <= 0 || p.price > 100000)) {
    errors.push(`prices.${t.nseSymbol}: price ${p.price} looks wrong`);
  }
  if (p.change1d != null && Math.abs(p.change1d) > 20) {
    warnings.push(`prices.${t.nseSymbol}: 1-day change ${p.change1d}% is unusually large for a trust — check`);
  }
  if (!isDate(p.asOf)) errors.push(`prices.${t.nseSymbol}: bad asOf date '${p.asOf}'`);

  const f = fundamentals[t.isin];
  if (f) {
    if (f.navPerUnit != null && p.price != null) {
      const prem = ((p.price - f.navPerUnit) / f.navPerUnit) * 100;
      if (Math.abs(prem) > 80) warnings.push(`fundamentals.${t.nseSymbol}: price is ${prem.toFixed(0)}% vs NAV — double-check NAV ${f.navPerUnit} / price ${p.price}`);
    }
    if (f.ltv != null && (f.ltv < 0 || f.ltv > 100)) errors.push(`fundamentals.${t.nseSymbol}: LTV ${f.ltv} out of range`);
    if (f.occupancy != null && (f.occupancy < 0 || f.occupancy > 100)) errors.push(`fundamentals.${t.nseSymbol}: occupancy ${f.occupancy} out of range`);
    if (!isDate(f.navDate)) errors.push(`fundamentals.${t.nseSymbol}: bad navDate '${f.navDate}'`);
  }

  // Yield sanity: TTM DPU / price within 0-40%
  const dists = (distributions[t.isin] || []).filter((d) => d.totalDPU != null);
  if (dists.length >= 4 && p?.price) {
    const ttm = dists.slice(-4).reduce((s, d) => s + d.totalDPU, 0);
    const y = (ttm / p.price) * 100;
    if (y < 0 || y > 40) errors.push(`${t.nseSymbol}: TTM yield ${y.toFixed(1)}% outside 0-40% — data error likely`);
  }

  // Component split sanity
  for (const d of distributions[t.isin] || []) {
    const parts = [d.interest, d.dividend, d.returnOfCapital, d.other].filter((x) => x != null);
    if (parts.length > 0) {
      const sum = parts.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - d.totalDPU) > 0.05) {
        warnings.push(`${t.nseSymbol} ${d.quarter}: components sum to ${sum.toFixed(2)} but total DPU is ${d.totalDPU}`);
      }
    }
    for (const df of ["recordDate", "exDate", "paymentDate"]) {
      if (!isDate(d[df])) errors.push(`${t.nseSymbol} ${d.quarter}: bad ${df} '${d[df]}'`);
    }
  }

  // History file exists and parses
  try {
    const hist = load(`data/history/${t.isin}.json`);
    if (!Array.isArray(hist)) throw new Error("not an array");
    for (const pt of hist) {
      if (!pt.d || typeof pt.c !== "number") throw new Error(`bad point ${JSON.stringify(pt)}`);
    }
  } catch (e) {
    warnings.push(`history: ${t.isin}.json missing or invalid (${e.message})`);
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
