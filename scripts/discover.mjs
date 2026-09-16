#!/usr/bin/env node
/**
 * discover.mjs — NSE corporate-announcements discovery for REITs/InvITs.
 *
 * What it does:
 *  1. Warms up NSE cookies (GET https://www.nseindia.com) then fetches
 *     GET /api/corporate-announcements?index=invitsreits
 *  2. Maps feed symbols onto data/trusts.json. A symbol in the feed that is NOT
 *     in the universe and looks like a REIT/InvIT unit (not an NCD/CP) is appended
 *     as a stub with needsReview:true — new listings auto-appear for review.
 *  3. Collects distribution-ish filings (attchmntText/desc match
 *     /distribut|record date|NDCF|dividend/i) into data/filings-queue.json for
 *     parse-distributions.mjs.
 *
 * Never fabricates: unknown fields stay null. Discovery failures leave existing
 * data untouched and exit 0 (tonight's prices/distributions are unaffected).
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const alertsPath = join(root, "data/alerts.json");

function loadJson(rel, fallback) {
  try {
    if (existsSync(join(root, rel))) return JSON.parse(readFileSync(join(root, rel), "utf8"));
  } catch {
    /* fall through */
  }
  return fallback;
}

function addAlerts(alerts) {
  if (!alerts.length) return;
  const existing = loadJson("data/alerts.json", []);
  writeFileSync(alertsPath, JSON.stringify([...existing, ...alerts], null, 2));
}

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.nseindia.com/companies-listing/corporate-filings-announcements",
};

async function fetchNseFeed() {
  // Cookie warm-up: NSE rejects API calls without session cookies.
  const warm = await fetch("https://www.nseindia.com", {
    headers: { "User-Agent": NSE_HEADERS["User-Agent"] },
    redirect: "follow",
  });
  const setCookies = warm.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");

  const res = await fetch("https://www.nseindia.com/api/corporate-announcements?index=invitsreits", {
    headers: { ...NSE_HEADERS, ...(cookie ? { Cookie: cookie } : {}) },
  });
  if (!res.ok) throw new Error(`NSE feed -> HTTP ${res.status}`);
  const j = await res.json();
  return Array.isArray(j) ? j : [];
}

// NCDs/CPs appear in the same feed; exclude them from universe auto-add.
function looksLikeDebt(row) {
  const text = `${row.desc || ""} ${row.attchmntText || ""}`;
  if (/debenture|\bNCD\b|commercial paper|\bCP\b/i.test(text)) return true;
  if (/^97\d{4}$/.test(String(row.symbol || ""))) return true; // debt scrip codes
  return false;
}

const DIST_RE = /distribut|record date|NDCF|dividend/i;

async function main() {
  const trustsDoc = loadJson("data/trusts.json", null);
  if (!trustsDoc) {
    console.error("FATAL: data/trusts.json missing or unreadable");
    process.exit(1);
  }
  const alerts = [];

  let rows;
  try {
    rows = await fetchNseFeed();
  } catch (e) {
    console.error(`NSE feed fetch failed: ${e.message} — leaving data untouched`);
    addAlerts([{ type: "discover-failed", message: `NSE invitsreits feed failed: ${e.message}`, at: new Date().toISOString() }]);
    process.exit(0); // discovery failure must not break tonight's other jobs
  }
  console.log(`NSE invitsreits feed: ${rows.length} announcements`);

  const knownSymbols = new Set(trustsDoc.universe.map((t) => t.nseSymbol));
  const newTrusts = [];

  // 1) New-trust discovery
  for (const row of rows) {
    const symbol = String(row.symbol || "").trim();
    if (!symbol || knownSymbols.has(symbol)) continue;
    if (looksLikeDebt(row)) continue;
    const stub = {
      isin: null,
      nseSymbol: symbol,
      bseCode: null,
      name: symbol,
      type: null,
      sector: null,
      sponsor: null,
      listedDate: null,
      lotSize: 1,
      needsReview: true,
      firstSeen: (row.an_dt || "").slice(0, 10) || null,
      note: "Auto-discovered from NSE invitsreits feed — fill in ISIN/BSE/type before prices can refresh.",
    };
    newTrusts.push(stub);
    knownSymbols.add(symbol);
  }

  if (newTrusts.length) {
    trustsDoc.universe.push(...newTrusts);
    writeFileSync(join(root, "data/trusts.json"), JSON.stringify(trustsDoc, null, 2));
    for (const t of newTrusts) {
      console.log(`NEW  ${t.nseSymbol}: stub appended to trusts.json (needsReview)`);
      alerts.push({
        type: "new-trust",
        message: `New symbol ${t.nseSymbol} found on NSE invitsreits feed — stub added to trusts.json, needs manual review (ISIN, BSE code, type).`,
        at: new Date().toISOString(),
      });
    }
  } else {
    console.log("No new trusts discovered.");
  }

  // 2) Distribution-filing queue
  const queue = loadJson("data/filings-queue.json", []);
  const seen = new Set(queue.map((f) => String(f.seq_id ?? `${f.symbol}|${f.date}|${f.pdfUrl}`)));
  let added = 0;

  for (const row of rows) {
    const text = `${row.attchmntText || ""} ${row.desc || ""}`;
    if (!DIST_RE.test(text)) continue;
    const pdfUrl = row.attchmntFile || null;
    if (!pdfUrl) continue;
    const filing = {
      symbol: String(row.symbol || "").trim(),
      date: (row.an_dt || "").slice(0, 10) || null,
      desc: (row.attchmntText || row.desc || "").trim(),
      pdfUrl,
      seq_id: row.seq_id ?? null,
      queuedAt: new Date().toISOString(),
    };
    const dedupeKey = String(filing.seq_id ?? `${filing.symbol}|${filing.date}|${filing.pdfUrl}`);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    queue.push(filing);
    added++;
  }

  writeFileSync(join(root, "data/filings-queue.json"), JSON.stringify(queue, null, 2));
  console.log(`filings-queue.json: ${added} new distribution-ish filing(s), ${queue.length} total.`);

  addAlerts(alerts);
}

main().catch((e) => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
