#!/usr/bin/env node
/**
 * refresh-prices.mjs — nightly price refresh.
 *
 * What it does:
 *  1. Reads the trust universe from data/trusts.json
 *  2. Fetches the latest EOD close + history for each trust from Upstox v2 API
 *     (requires UPSTOX_TOKEN env var — set as a GitHub Actions secret)
 *  3. Rewrites data/prices.json and data/history/<ISIN>.json
 *  4. The GitHub Action then commits the changes and Vercel rebuilds.
 *
 * Failure policy: if the token is missing/expired or any call fails, this script
 * exits non-zero with a clear message. The site keeps serving the last committed
 * data — nothing on the frontend breaks.
 *
 * Why Upstox: their API terms allow personal-use EOD data. We never publish
 * live/intraday prices — only the daily close, after market hours.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.UPSTOX_TOKEN;

if (!TOKEN) {
  console.error("ERROR: UPSTOX_TOKEN is not set.");
  console.error("Add it in GitHub: repo → Settings → Secrets and variables → Actions → New repository secret.");
  console.error("Upstox tokens typically expire daily — regenerate at https://api.upstox.com and update the secret.");
  process.exit(1);
}

const trusts = JSON.parse(readFileSync(join(root, "data/trusts.json"), "utf8")).universe;

// Upstox instrument key format: NSE_EQ|<ISIN>
const instrumentKey = (isin) => `NSE_EQ|${isin}`;

async function upstox(path) {
  const res = await fetch(`https://api.upstox.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (res.status === 401) {
    throw new Error(
      "Upstox returned 401 Unauthorized — the access token has expired. " +
        "Regenerate it and update the UPSTOX_TOKEN GitHub secret. " +
        "The site keeps showing the last good data until then."
    );
  }
  if (!res.ok) throw new Error(`Upstox ${path} -> HTTP ${res.status}: ${await res.text()}`);
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

  for (const t of trusts) {
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
