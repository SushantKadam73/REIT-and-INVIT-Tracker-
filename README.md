# REIT & InvIT Tracker (India)

A minimal, fast, honest tracker for REITs and InvITs listed on NSE/BSE, built for Indian retail investors.

## What it is

- **EOD prices only** — no live/intraday data. Prices refresh nightly via GitHub Action.
- **Distribution honesty** — every DPU is split into interest, dividend, return of capital, and other. Never fabricated.
- **Tax-aware yields** — TTM and recurring yield, plus post-tax estimates at your slab.
- **No rankings** — REITs compare with REITs, InvITs with InvITs. Four profile scorecards with published weights instead of a single "best buy".
- **Portfolio simulator** — 100% client-side (localStorage). No login, no server.

## Architecture

```
Next.js (App Router) + TypeScript + Tailwind
Static site — no database, no server state
Data: versioned JSON in data/
Refresh: GitHub Action runs nightly, fetches EOD prices from Upstox, commits data/prices.json
Deploy: Vercel (free hobby tier)
```

## Data model

- `data/trusts.json` — canonical universe (ISIN, symbols, sector, sponsor, listed date)
- `data/prices.json` — latest EOD price, previous close, 1-day change, as-of date, source — **keyed by ISIN**
- `data/history/<ISIN>.json` — daily EOD close history (last ~13 months) — **keyed by ISIN**
- `data/distributions.json` — distribution history per trust (quarter, FY, DPU, component split, dates, source) — **keyed by NSE symbol**
- `data/fundamentals.json` — NAV, LTV, occupancy/concession life, GAV, market cap, as-of dates — **keyed by NSE symbol**
- `data/filings-queue.json` — distribution filings discovered on NSE, awaiting PDF parsing
- `data/alerts.json` — parser fallbacks, token failures, new-trust discoveries (drained by notify.mjs)

## How the nightly refresh works

GitHub Action `.github/workflows/refresh.yml` runs at **17:45 IST Mon–Fri** (`15 12 * * 1-5` UTC)
plus manual `workflow_dispatch`. Four jobs, all `continue-on-error` — a failure never wipes
last-good data:

1. **Prices** (`scripts/refresh-prices.mjs`) — fetches daily candles per trust from the Upstox
   v2 historical-candle API (`NSE_EQ|<ISIN>`) and rewrites `data/prices.json` +
   `data/history/<ISIN>.json`. Only overwrites prices.json if ≥ half the universe succeeded.
2. **Discovery** (`scripts/discover.mjs`) — reads the NSE `corporate-announcements?index=invitsreits`
   feed. Unknown REIT/InvIT-looking symbols are appended to `trusts.json` as `needsReview:true`
   stubs (NCDs/CPs filtered out); distribution-ish filings go to `data/filings-queue.json`.
3. **Distributions + fundamentals** (`scripts/parse-distributions.mjs`, `scripts/fundamentals.mjs`) —
   queued PDFs are downloaded, text-extracted (poppler `pdftotext`, `pdf-parse` fallback) and parsed
   via per-trust templates in `scripts/parsers/<SYMBOL>.mjs` (generic fallback). Fundamentals are
   cross-checked against the Upstox Fundamentals API by ISIN (company-profile / key-ratios /
   corporate-actions). **The component split is never fabricated**: if the parsed components don't
   sum to totalDPU within ±0.05, the row is saved with split fields `null` +
   `note: "split unavailable — format not recognised"` and the filing is flagged in
   `data/alerts.json`. Upstox corporate-actions only returns a single amount — it's used as a
   divergence cross-check, never as the split source.
4. **Validate + alert + commit** — `scripts/validate-data.mjs` guards the keying contract
   (prices/history ISIN-keyed; distributions/fundamentals symbol-keyed) and component sums;
   `scripts/notify.mjs` POSTs any alerts to `ALERT_WEBHOOK_URL` if set (logged otherwise); the bot
   commits changed `data/` back to `main` and Vercel rebuilds.

### The Analytics token (required)

Prices use the **Upstox Analytics token** — a 1-year, read-only, free token. No static IP needed,
no daily regeneration (the old daily-expiry `UPSTOX_TOKEN` flow is gone).

- Get it: https://account.upstox.com/developer/apps → your app → **Analytics** → generate token.
- On expiry the refresh logs `Analytics token expired — regenerate at
  account.upstox.com/developer/apps → Analytics`, raises an alert, and the site keeps serving
  last-good data.

### Secrets (2)

Repo → **Settings → Secrets and variables → Actions**:

- `UPSTOX_ANALYTICS_TOKEN` — **required**, the 1-year Analytics token above.
- `ALERT_WEBHOOK_URL` — **optional**, any generic JSON webhook (Telegram/Discord/Slack-style).
  Unset = alerts are only written to the Action log and `data/alerts.json`.

### Rate limits & backoff

EOD only, once per weekday night, ~300–500 ms politeness delay between calls; the free GitHub
Actions tier (2000 min/month) is vastly more than the few minutes this uses. On a 401 the scripts
stop hammering immediately and alert.

### Last-good-data policy

Every job merges with the previously committed JSON; `prices.json` is only rewritten when at least
half the universe refreshed successfully. A bad token, an NSE outage, or an unparseable PDF can
never blank the site.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/SushantKadam73/REIT-and-INVIT-Tracker-.git
cd REIT-and-INVIT-Tracker-
npm install
```

### 2. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 3. The GitHub Actions workflow

`.github/workflows/refresh.yml` is committed in the repo — nothing to add by hand. It schedules
the nightly refresh at 17:45 IST Mon–Fri and can also be triggered manually from the
**Actions → Nightly data refresh → Run workflow** button.

### 4. Add GitHub secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

- `UPSTOX_ANALYTICS_TOKEN` — **required.** The 1-year read-only Upstox Analytics token
  (https://account.upstox.com/developer/apps → your app → Analytics). No static IP needed, no
  daily regeneration. When the Action logs a 401, regenerate it there and update this secret —
  the site keeps showing last-good data in the meantime.
- `ALERT_WEBHOOK_URL` — **optional.** Any generic webhook URL (Telegram/Discord/Slack-style).
  Alerts (token expiry, unparseable distribution PDFs, newly discovered trusts) are POSTed here;
  if unset they're just written to the Action log.

### 5. Deploy to Vercel

1. Go to https://vercel.com/new and import `SushantKadam73/REIT-and-INVIT-Tracker-`.
2. Vercel auto-detects Next.js. No build settings to change (vercel.json is committed).
3. Click **Deploy**. The site is live immediately with seeded data.

## How to add a new trust

1. Add the trust to `data/trusts.json` with ISIN, NSE symbol, BSE code, name, type, sector, sponsor, listed date.
2. Add fundamentals to `data/fundamentals.json` (NAV, LTV, occupancy, GAV, as-of dates, source URL).
3. Add distribution history to `data/distributions.json` (quarter, FY, DPU, component split, dates, source URL).
4. Run `npm run validate` to sanity-check the data.
5. Push. The next nightly refresh will pick up prices automatically.

## Validation

```bash
npm run validate
```

Checks: required fields present, dates parse, yields within 0-40%, component splits sum to DPU total.

## Disclaimer

This is an educational tool, not investment advice. The authors are not SEBI-registered advisors. All data is sourced from public filings and exchange APIs. Prices are end-of-day and may be stale. Always verify with the trust's official disclosures before investing.

## License

MIT
