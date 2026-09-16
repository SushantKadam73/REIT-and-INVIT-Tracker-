#!/usr/bin/env node
/**
 * refresh-prices.mjs — nightly EOD price + history refresh.
 *
 * What it does:
 *  1. Reads the trust universe from data/trusts.json (prices/history are ISIN-keyed)
 *  2. Fetches daily candles for each trust from the Upstox v2 historical-candle API
 *     using the UPSTOX_ANALYTICS_TOKEN env var (1-year read-only Analytics token —
 *     the old daily-expiry UPSTOX_TOKEN flow is obsolete and was removed)
 *  3. Rewrites data/prices.json and data/history/<ISIN>.json
 *  4. The GitHub Action commits the changes; Vercel rebuilds.
 *
 * Failure policy:
 *  - Missing token / per-ISIN failures never wipe good data.
 *  - prices.json is only overwritten when >= half the universe succeeded tonight
 *    (merged with the previous file so failed trusts keep their last good data).
 *  - On HTTP 401 every subsequent call is skipped and data/alerts.json gets an
 *    alert for notify.mjs. The site keeps serving the last committed data.
 *
 * Why Upstox: their API terms allow personal-use EOD data. We never publish
 * live/intraday prices — only the daily close, after market hours.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.UPSTOX_ANALYTICS_TOKEN;

const alertsPath = join(root, "data/alerts.json");

function addAlert(type, message) {
  let alerts = [];
  try {
    if (existsSync(alertsPath)) alerts = JSON.parse(readFileSync(alertsPath, "utf8"));
  } catch {
    alerts = [];
  }
  alerts.push({ type, message, at: new Date().toISOString() });
  writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));
}

if (!TOKEN) {
  console.error("ERROR: UPSTOX_ANALYTICS_TOKEN is not set.");
  console.error("Add it in GitHub: repo → Settings → Secrets and variables → Actions → New repository secret.");
  console.error("Get the 1-year read-only Analytics token at account.upstox.com/developer/apps → your app → Analytics.");
  process.exit(1);
}

const trusts = JSON.parse(readFileSync(join(root, "data/trusts.json"), "utf8")).universe;

// Upstox instrument key format: NSE_EQ|<ISIN>
const instrumentKey = (isin) => `NSE_EQ|${isin}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upstox(path) {
  // Small politeness delay — free Analytics tier rate limits are not published.
  await sleep(300);
  const res = await fetch(`https://api.upstox.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (res.status === 401) {
    const err = new Error(
      "Analytics token expired — regenerate at account.upstox.com/developer/apps → Analytics"
    );
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error(`Upstox ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function istToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
}

async function main() {
  const today = istToday();
  const from = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10); // ~13 months back

  const prices = {};
  let failures = 0;
  let tokenDead = false;

  for (const t of trusts) {
    if (tokenDead) {
      console.warn(`SKIP ${t.nseSymbol}: token unauthorized — not attempting further calls`);
      failures++;
      continue;
    }
    const key = encodeURIComponent(instrumentKey(t.isin));
    try {
      // Daily candles: /v2/historical-candle/{instrument_key}/day/{to}/{from}
      const j = await upstox(`/v2/historical-candle/${key}/day/${today}/${from}`);
      const candles = j?.data?.candles || [];
      // candle: [timestamp, open, high, low, close, volume, oi]
      const history = candles
        .map((c) => ({ d: c[0].slice(0, 10), c: c[4] }))
        .sort((a, b) => a.d.localeCompare(b.d));

      if (history.length === 0) {
        console.warn(`WARN ${t.nseSymbol}: no candles returned — keeping old data`);
        failures++;
        continue;
      }

      const last = history[history.length - 1];
      const prev = history.length > 1 ? history[history.length - 2] : null;
      const change1d = prev ? Math.round(((last.c - prev.c) / prev.c) * 10000) / 100 : null;

      prices[t.isin] = {
        symbol: t.nseSymbol,
        name: t.name,
        type: t.type,
        price: last.c,
        prevClose: prev?.c ?? null,
        change1d,
        asOf: last.d,
        source: "Upstox v2 API (EOD)",
      };

      writeFileSync(join(root, "data/history", `${t.isin}.json`), JSON.stringify(history, null, 2));
      console.log(`OK   ${t.nseSymbol}: ₹${last.c} on ${last.d} (${history.length} days)`);
    } catch (e) {
      console.error(`FAIL ${t.nseSymbol}: ${e.message}`);
      failures++;
      if (e.status === 401) {
        tokenDead = true;
        addAlert("token-401", `${e.message} (detected during price refresh for ${t.nseSymbol})`);
      }
    }
  }

  // Only overwrite prices.json if we got at least half the universe —
  // a bad token shouldn't wipe good data.
  const okCount = Object.keys(prices).length;
  if (okCount >= Math.ceil(trusts.length / 2)) {
    // Merge: keep old entries for trusts that failed tonight
    const old = JSON.parse(readFileSync(join(root, "data/prices.json"), "utf8"));
    const merged = { ...old, ...prices };
    writeFileSync(join(root, "data/prices.json"), JSON.stringify(merged, null, 2));
    console.log(`\nprices.json updated for ${okCount}/${trusts.length} trusts.`);
  } else {
    console.error(`\nOnly ${okCount}/${trusts.length} trusts updated — refusing to overwrite prices.json.`);
    if (tokenDead) {
      console.error("Cause: UPSTOX_ANALYTICS_TOKEN is unauthorized. Regenerate it and update the GitHub secret.");
    }
    process.exit(1);
  }

  if (failures > 0) {
    console.warn(`${failures} trust(s) failed; old data preserved for those.`);
  }
}

main().catch((e) => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
