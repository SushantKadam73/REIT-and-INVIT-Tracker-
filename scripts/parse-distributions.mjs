#!/usr/bin/env node
/**
 * parse-distributions.mjs — parse quarterly distribution PDFs.
 *
 * The component split (interest/dividend/returnOfCapital/other) exists ONLY inside
 * each trust's quarterly distribution PDF, linked from the NSE announcements feed
 * (queued into data/filings-queue.json by discover.mjs).
 *
 * Pipeline per queued filing:
 *  1. Download the PDF, extract text with `pdftotext` (poppler — the workflow
 *     installs it), falling back to the `pdf-parse` npm package.
 *  2. Try scripts/parsers/<SYMBOL>.mjs if it exists, else the generic parser.
 *  3. If the parsed components sum to within ±0.05 of totalDPU, write the row to
 *     data/distributions.json (NSE-SYMBOL-keyed) with sourceUrl = the PDF URL.
 *  4. If not, write the row with split fields null + note
 *     "split unavailable — format not recognised" and append to data/alerts.json.
 *
 * RULE: never invent numbers. If a value cannot be parsed, it stays null.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const loadJson = (rel, fallback) => {
  try {
    if (existsSync(join(root, rel))) return JSON.parse(readFileSync(join(root, rel), "utf8"));
  } catch {
    /* fall through */
  }
  return fallback;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

async function extractPdfText(buf) {
  // Prefer poppler's pdftotext if installed (workflow installs it).
  const tmp = join(tmpdir(), `filing-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  writeFileSync(tmp, buf);
  try {
    const { stdout } = await execFileAsync("pdftotext", ["-layout", tmp, "-"], { maxBuffer: 32 * 1024 * 1024 });
    if (stdout && stdout.trim().length > 0) return stdout;
  } catch {
    /* pdftotext unavailable or failed — try pdf-parse */
  }
  try {
    const mod = await import("pdf-parse");
    const pdfParse = mod.default || mod;
    const out = await pdfParse(buf);
    return out.text || "";
  } catch (e) {
    throw new Error(`PDF text extraction failed (pdftotext + pdf-parse both failed): ${e.message}`);
  }
}

async function downloadPdf(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Referer: "https://www.nseindia.com/",
    },
  });
  if (!res.ok) throw new Error(`PDF download -> HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadParser(symbol) {
  const dir = join(root, "scripts/parsers");
  try {
    const files = readdirSync(dir);
    if (files.includes(`${symbol}.mjs`)) {
      const mod = await import(pathToFileURL(join(dir, `${symbol}.mjs`)).href);
      if (typeof mod.parse === "function") return mod.parse;
    }
  } catch {
    /* no parsers dir yet */
  }
  const mod = await import(pathToFileURL(join(dir, "generic.mjs")).href);
  return mod.parse;
}

function sumsToTotal(parsed) {
  if (parsed.totalDPU == null) return false;
  const parts = [parsed.interest, parsed.dividend, parsed.returnOfCapital, parsed.other].filter((x) => x != null);
  if (parts.length === 0) return false;
  const sum = parts.reduce((a, b) => a + b, 0);
  return Math.abs(sum - parsed.totalDPU) <= 0.05;
}

async function main() {
  const queue = loadJson("data/filings-queue.json", []);
  if (queue.length === 0) {
    console.log("filings-queue.json is empty — nothing to parse.");
    return;
  }
  const distributions = loadJson("data/distributions.json", {});
  const alerts = loadJson("data/alerts.json", []);
  const remaining = [];
  let parsedCount = 0;
  let fallbackCount = 0;

  for (const filing of queue) {
    const { symbol, pdfUrl } = filing;
    if (!symbol || !pdfUrl) {
      remaining.push(filing);
      continue;
    }
    // Dedupe: skip if this PDF is already recorded for the symbol
    const existing = distributions[symbol] || [];
    if (existing.some((d) => d.sourceUrl === pdfUrl)) {
      console.log(`SKIP ${symbol}: ${pdfUrl} already in distributions.json`);
      continue;
    }
    try {
      await sleep(500); // politeness — NSE archives
      const buf = await downloadPdf(pdfUrl);
      const text = await extractPdfText(buf);
      const parse = await loadParser(symbol);
      const parsed = (await parse(text, filing)) || {};

      const row = {
        quarter: parsed.quarter ?? null,
        fy: parsed.fy ?? null,
        totalDPU: num(parsed.totalDPU),
        interest: num(parsed.interest),
        dividend: num(parsed.dividend),
        returnOfCapital: num(parsed.returnOfCapital),
        other: num(parsed.other),
        recordDate: parsed.recordDate ?? null,
        exDate: parsed.exDate ?? null,
        paymentDate: parsed.paymentDate ?? null,
        sourceUrl: pdfUrl,
      };

      if (sumsToTotal(row)) {
        distributions[symbol] = [...existing, row];
        parsedCount++;
        console.log(`OK   ${symbol}: totalDPU ₹${row.totalDPU} (${row.quarter ?? "quarter?"}) — split verified`);
      } else {
        // Safe fallback: keep what we honestly have, never fabricate the split.
        const honest = {
          ...row,
          interest: null,
          dividend: null,
          returnOfCapital: null,
          other: null,
          note: "split unavailable — format not recognised",
        };
        if (honest.totalDPU == null) {
          // Nothing usable at all — keep the filing queued and alert instead of
          // writing an empty row.
          remaining.push(filing);
          alerts.push({
            type: "parse-failed",
            message: `${symbol}: could not extract any distribution data from ${pdfUrl}`,
            at: new Date().toISOString(),
          });
          console.warn(`FAIL ${symbol}: no data extracted — filing kept in queue, alert added`);
          continue;
        }
        distributions[symbol] = [...existing, honest];
        fallbackCount++;
        alerts.push({
          type: "split-missing",
          message: `${symbol}: distribution of ₹${honest.totalDPU} recorded but component split not recognised — needs a parser template (scripts/parsers/${symbol}.mjs). Source: ${pdfUrl}`,
          at: new Date().toISOString(),
        });
        console.warn(`PART ${symbol}: totalDPU ₹${honest.totalDPU} saved without split — alert added`);
      }
    } catch (e) {
      console.error(`FAIL ${symbol}: ${e.message}`);
      remaining.push(filing); // retry next run
    }
  }

  writeFileSync(join(root, "data/distributions.json"), JSON.stringify(distributions, null, 2));
  writeFileSync(join(root, "data/filings-queue.json"), JSON.stringify(remaining, null, 2));
  writeFileSync(join(root, "data/alerts.json"), JSON.stringify(alerts, null, 2));
  console.log(`\nDone: ${parsedCount} parsed with split, ${fallbackCount} saved without split, ${remaining.length} left in queue.`);
}

main().catch((e) => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
