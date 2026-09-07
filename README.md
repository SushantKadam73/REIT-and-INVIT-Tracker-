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
- `data/prices.json` — latest EOD price, previous close, 1-day change, as-of date, source
- `data/distributions.json` — distribution history per trust (quarter, FY, DPU, component split, dates, source)
- `data/fundamentals.json` — NAV, LTV, occupancy/concession life, GAV, market cap, as-of dates
- `data/history/<ISIN>.json` — daily EOD close history (last ~2 years)

## How the nightly refresh works

1. GitHub Action triggers at 17:30 IST (after market close).
2. `scripts/refresh-prices.ts` fetches EOD prices + candles from Upstox v2 API using `UPSTOX_TOKEN` secret.
3. It recomputes derived metrics (TTM yield, recurring yield, NAV premium/discount).
4. It commits updated `data/prices.json` and `data/history/*.json` back to the repo.
5. Vercel rebuilds the static site with fresh data.

If the Upstox token expires, the Action fails loudly but the site keeps serving last-good data.

## Setup

### 1. Clone and install

```bash
git clone https://github.com/SushantKadam73/reit-invit-tracker.git
cd reit-invit-tracker
npm install
```

### 2. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 3. Add GitHub secrets

Go to **Settings → Secrets and variables → Actions** and add:

- `UPSTOX_TOKEN` — your Upstox API access token (required for nightly price refresh)
- `TINYFISH_API_KEY` — optional, reserved for future research features

### 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to https://vercel.com/new and import the repo.
3. Vercel auto-detects Next.js. No build settings needed.
4. Deploy. The site is live immediately with seeded data.

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
