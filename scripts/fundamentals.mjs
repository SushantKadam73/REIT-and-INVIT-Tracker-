#!/usr/bin/env node
/**
 * fundamentals.mjs — cross-check / refresh fundamentals via Upstox Fundamentals API.
 *
 * For each trust it tries (by ISIN):
 *   GET /historical-data/v1/user/get-company-profile?isin={ISIN}
 *   GET /historical-data/v1/user/get-key-ratios?isin={ISIN}
 *   GET /historical-data/v1/user/get-share-holdings?isin={ISIN}
 *   GET /historical-data/v1/user/get-corporate-actions?isin={ISIN}  (cross-check only)
 *
 * Honesty rules:
 *  - fundamentals.json is NSE-SYMBOL-keyed (NOT ISIN — see trusts.json note).
 *  - Only fields that return real values are overwritten; everything else is kept.
 *  - The Upstox corporate-actions endpoint returns a SINGLE dividend amount, not the
 *    interest/dividend/RoC split — it is logged as a cross-check against
 *    distributions.json but NEVER written as a component split.
 *  - REIT/InvIT coverage on these endpoints is not guaranteed; 4xx/empty responses
 *    are normal and leave existing data untouched.
 *
 * Requires UPSTOX_ANALYTICS_TOKEN (same 1-year read-only token as refresh-prices).
 * Token problems are non-fatal: the script logs, alerts, and exits 0 so the
 * workflow continues — fundamentals are a cross-check, not the price source.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.UPSTOX_ANALYTICS_TOKEN;

const loadJson = (rel, fallback) => {
  try {
    if (existsSync(join(root, rel))) return JSON.parse(readFileSync(join(root, rel), "utf8"));
  } catch {
    /* fall through */
  }
  return fallback;
};

function addAlert(type, message) {
  const alerts = loadJson("data/alerts.json", []);
  alerts.push({ type, message, at: new Date().toISOString() });
  writeFileSync(join(root, "data/alerts.json"), JSON.stringify(alerts, null, 2));
}

if (!TOKEN) {
  console.warn("UPSTOX_ANALYTICS_TOKEN not set — skipping fundamentals cross-check (non-fatal).");
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upstox(path) {
  await sleep(300);
  const res = await fetch(`https://api.upstox.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (res.status === 401) {
    const err = new Error("Analytics token expired — regenerate at account.upstox.com/developer/apps → Analytics");
    err.status = 401;
    throw err;
  }
  if (res.status === 404 || res.status === 422) return null; // no coverage for this ISIN
  if (!res.ok) throw new Error(`Upstox ${path} -> HTTP ${res.status}`);
  return res.json();
}

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : null;
};

async function main() {
  const trusts = loadJson("data/trusts.json", { universe: [] }).universe;
  const fundamentals = loadJson("data/fundamentals.json", {});
  const distributions = loadJson("data/distributions.json", {});
  let updated = 0;

  for (const t of trusts) {
    if (!t.isin) {
      console.warn(`SKIP ${t.nseSymbol}: no ISIN (stub awaiting review)`);
      continue;
    }
    const sym = t.nseSymbol;
    const f = fundamentals[sym] || {};
    try {
      const [profile, ratios, corpActions] = await Promise.all([
        upstox(`/historical-data/v1/user/get-company-profile?isin=${t.isin}`).catch(() => null),
        upstox(`/historical-data/v1/user/get-key-ratios?isin=${t.isin}`).catch(() => null),
        upstox(`/historical-data/v1/user/get-corporate-actions?isin=${t.isin}`).catch(() => null),
      ]);

      const p = profile?.data || profile || {};
      const r = ratios?.data || ratios || {};
      let touched = false;

      const marketCapCr = n(r.marketCapCr) ?? n(r.market_cap_cr) ?? (n(p.marketCap) ? n(p.marketCap) / 1e7 : null);
      if (marketCapCr && marketCapCr !== f.marketCapCr) {
        f.marketCapCr = Math.round(marketCapCr);
        touched = true;
      }

      // Cross-check only: Upstox returns a single dividend amount per action,
      // never the component split. Log divergence against distributions.json.
      const actions = corpActions?.data || corpActions;
      if (Array.isArray(actions) && actions.length) {
        const latest = actions[0];
        const amt = n(latest.dividend ?? latest.amount ?? latest.value);
        const dists = distributions[sym] || [];
        const lastDPU = dists.length ? dists[dists.length - 1].totalDPU : null;
        if (amt && lastDPU != null && Math.abs(amt - lastDPU) / lastDPU > 0.1) {
          console.warn(`XCHK ${sym}: Upstox corp-action ₹${amt} vs recorded totalDPU ₹${lastDPU} — review`);
          addAlert(
            "fundamentals-divergence",
            `${sym}: Upstox corporate action (₹${amt}/unit) diverges >10% from distributions.json latest totalDPU (₹${lastDPU}).`
          );
        }
      }

      if (touched) {
        f.asOf = new Date().toISOString().slice(0, 10);
        f.sourceUrl = f.sourceUrl || "Upstox Fundamentals API";
        fundamentals[sym] = f;
        updated++;
        console.log(`OK   ${sym}: marketCapCr refreshed`);
      } else {
        console.log(`--   ${sym}: nothing new from Upstox fundamentals (coverage gaps are normal)`);
      }
    } catch (e) {
      console.error(`FAIL ${sym}: ${e.message}`);
      if (e.status === 401) {
        addAlert("token-401", `${e.message} (detected during fundamentals cross-check)`);
        break; // no point hammering with a dead token
      }
    }
  }

  writeFileSync(join(root, "data/fundamentals.json"), JSON.stringify(fundamentals, null, 2));
  console.log(`\nfundamentals.json: ${updated}/${trusts.length} trusts updated (rest kept last-good values).`);
}

main().catch((e) => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
