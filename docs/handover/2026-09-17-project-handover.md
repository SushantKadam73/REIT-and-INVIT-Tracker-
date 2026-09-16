# REIT & InvIT Tracker — complete project handover

Snapshot: 17 September 2026, shortly after midnight IST. Development and debugging paused at the user's request. This document consolidates the research, approved requirements, architecture, implementation, incidents, unresolved issues and restart criteria from the conversation. It is a handover, not a claim that the product is production-ready.

## 1. Executive status

The project has a deployed Next.js application, populated seed datasets, calculators, comparison pages and an initial GitHub Actions ingestion pipeline. It does NOT yet meet the user's principal requirement: reliable, fully automatic discovery and updates without manual data entry.

At the documentation audit, the latest repository main commit was df7e3543d768adcdb069a3cb838a2a6ef6ebff1c, dated 16 September 2026 18:33:38 UTC. Its message says nightly refresh, but it changed only data/alerts.json. All 15 entries in data/prices.json still have asOf 2026-09-07 and source BSE India public API (EOD). A green workflow is not evidence that financial data refreshed.

Do not resume debugging or migrate the backend merely because this handover exists. The user said: stop wasting time on the current loop and document everything in the repo and Notion. No application code, workflow, secrets, schedules or production settings are changed as part of this documentation task. Existing automation has NOT been disabled; stopping work in chat does not stop repository schedules.

Links:
- Repository: https://github.com/SushantKadam73/REIT-and-INVIT-Tracker-
- Deployed URL: https://reit-invit.vercel.app/
- Conversation: https://hyperagent.com/thread/cmtrd5gv713hj07adghe6hax5
- Audited main: https://github.com/SushantKadam73/REIT-and-INVIT-Tracker-/commit/df7e3543d768adcdb069a3cb838a2a6ef6ebff1c
- Latest observed run: https://github.com/SushantKadam73/REIT-and-INVIT-Tracker-/actions/runs/35135096190

## 2. Product goal and standing constraints

Build a minimal, useful Indian listed REIT/InvIT platform for retail investors to understand distribution income, compare trusts, simulate taxes and portfolios, and evaluate an investment at a stated price. The user disliked reitinvittracker.com's UX but wanted its core features. Desired experience: clean, fast, easy to understand, mobile-friendly, light and dark modes, English UI, IST dates, rupee symbol and Indian lakh/crore formatting.

The user has moderate frontend knowledge and little backend/system-design experience. Explain architectural reasoning; do not merely produce code. Ask pointed clarifying questions when requirements are ambiguous. Delivery is GitHub code, Vercel deployment, then actual live interaction and numeric verification—not a successful push alone.

Hosting must have zero recurring cost. Prefer free hard caps and reduce polling/retention/scope rather than add paid dependencies. Existing fallback VPS described in prior context: 2 vCPU, 2 GB RAM, 25 GB disk. Shared free-tier allowances must account for the user's other projects.

Original v1 defaults approved: repository name reit-invit-tracker, no-login browser-local portfolio, EOD prices. Actual repository name differs and has a trailing hyphen. Repository visibility was described inconsistently during the work (initially private; later publicly readable); do not change visibility without authorization.

Expanded requirement approved on 16 September: automatic new-trust discovery, prices, distribution history and components, fundamentals, safe parsing fallbacks, alerts and rate-limit/error handling. User explicitly requested exploration of Upstox Fundamentals, not just prices. User has an Upstox Analytics token and mentioned a free TinyFish API. TinyFish is not integrated in the implemented ingestion pipeline.

## 3. Scope and market universe

Core retail universe seeded: 6 REITs and 9 InvITs. This is a seed snapshot, NOT a verified permanent census of every Indian listed trust.

REIT symbol / BSE code:
- Embassy Office Parks REIT: EMBASSY / 542602.
- Mindspace Business Parks REIT: MINDSPACE / 543217.
- Brookfield India Real Estate Trust: BIRET / 543261.
- Nexus Select Trust: NXST / 543913.
- Knowledge Realty Trust: KRT / 544481.
- Bagmane Prime Office REIT: BAGMANE / 544758.

InvIT symbol / BSE code:
- IRB InvIT Fund: IRBINVIT / 540526.
- IndiGrid Infrastructure Trust: INDIGRID / 540565.
- POWERGRID Infrastructure Investment Trust: PGINVIT / 543290.
- Indus Infra Trust: INDUSINVIT / 544137; older name Bharat Highways InvIT.
- Capital Infra Trust: CAPINVIT / 544338.
- Anantam Highways Trust: ANANTAM / 544579.
- Raajmarg Infra Investment Trust: RIIT / 544734.
- Citius TransNet Investment Trust: CITIUSINVT / 544753.
- Cube Highways Trust: CUBEINVIT / 543899.

Identifiers and eligibility require authoritative instrument-master/listing-notice reconciliation. Early research returned incorrect identifiers and dates (including KREALTY, RAAJMARG and alternate PGInvIT codes). The later seed is not itself proof of correctness. Cube's original private listing date must be distinguished from its reported July 2026 public OFS. NDR's SEBI registration date was previously mislabeled as a listing date. Historical sponsor descriptions may be stale.

Registered, exchange-listed, publicly offered, privately placed, retail-tradable and index-eligible are different classifications. SEBI's February 2026 count cited in research included privately listed InvITs. A Nifty index factsheet's 13 constituents was not the entire listed universe. Lot size 1 alone is insufficient to prove core retail eligibility; units must also be distinguished from a trust's listed bonds and commercial paper.

SM REIT schemes such as Propshare Platina/Titania/Celestia are separate scheme securities and should not be collapsed into one trust row with one code. They and large-ticket privately placed units were deferred from v1's default retail comparison, not declared unlisted.

Auto-discovery has added VERTIS, INTERISE and NXT-INFRA as needsReview candidates with null ISIN/type and incomplete metadata. These are not proven newly listed securities. Default list views now hide unresolved candidates. Full automatic identity resolution and eligibility assessment remain unimplemented.

## 4. Research findings and metric requirements

A useful comparison must go beyond generic equity dividend yield. Relevant data includes total distribution per unit (DPU), component breakdown, reporting period, announcement/ex/record/payment dates, NAV per unit with valuation date, NDCF, leverage and debt maturity, occupancy and lease duration for REITs, concession life/availability/traffic for infrastructure, price liquidity and total return.

REIT cash flows (office rent, retail rent) and InvIT cash flows (tolls, annuities, transmission, renewables) carry different risks. Default comparison is by REIT/InvIT type, ideally narrower sector cohorts. The user accepted income/value/safety/growth profiles instead of an opaque universal buy recommendation. Profiles are still analytical judgments and disclaimers do not automatically exempt a product from regulation.

NDCF means net distributable cash flow. The SEBI minimum-distribution framework was identified as a key rule; it is not 90% of accounting profit or a promised yield. The August 2026 InvIT major-maintenance add-back change demonstrates why versioned definitions matter. Indian NDCF must not be relabeled as US FFO/AFFO without reconciliation.

Required distinctions:
- Trailing distribution yield versus forward guidance, FY totals and next-12-month forecasts.
- Cash received versus taxable components, principal repayment, recurring operating cash and total investment return.
- Reported NAV versus current trading price; a discount to a dated appraisal is not guaranteed undervaluation or redemption value.
- Occupancy versus committed occupancy; gross versus net debt; matching valuation and reporting scopes.
- Unknown data versus zero; partial coverage versus a complete period.

Important correction: subtracting every principal-repayment component does NOT establish a rigorous recurring operating-income measure. Tax/legal classification and economic cash-flow sustainability are distinct. Prior descriptions of that subtraction as the uniquely honest yield were too categorical.

## 5. Architecture as implemented

Next.js 14.2.35 App Router, TypeScript, Tailwind, static export, Vercel. Financial data is bundled from versioned JSON at build time. There is no runtime financial database and no Convex deployment. Portfolio simulator uses browser localStorage; it has no cross-device persistence or account sync.

Data flow intended:
1. Scheduled GitHub Action fetches provider data and filings.
2. Scripts parse and update repository JSON.
3. Validator checks a subset of schema and numeric constraints.
4. Alert sender optionally posts a webhook payload.
5. Bot commits updated data and pushes main.
6. Vercel builds a new static deployment from GitHub.

This couples ingestion, shared Git state and site deployment. Jobs can report success while individual steps fail; data updates can conflict with concurrent commits; failed builds can leave the previous deployment serving old data.

Application paths:
- / — REIT and InvIT lists.
- /trust/[symbol]/ — trust detail, chart, distributions, fundamentals, scores.
- /calculator/ — investment amount/units and income scenarios.
- /tax/ — educational distribution and capital-gains calculations.
- /portfolio/ — local hypothetical holdings, value/income and allocation.
- /compare/ — select 2–4 same-type trusts.
- /methodology/ — metric and score explanations.

## 6. Files and keying contract

- data/trusts.json: object containing version/asOf/source/universe. Canonical seed fields include isin, nseSymbol, bseCode, name, type, sector, sponsor, listedDate and lotSize. Discovery appends incomplete needsReview records.
- data/prices.json: ISIN-keyed price records: price, prevClose, change1d, asOf and source.
- data/history/<ISIN>.json: arrays of d (date) and c (close).
- data/distributions.json: NSE-symbol-keyed arrays of quarter, fy, totalDPU, interest, dividend, returnOfCapital, other, note, dates and sourceUrl.
- data/fundamentals.json: NSE-symbol-keyed NAV, leverage, occupancy/concession, GAV, market cap and source fields.
- data/filings-queue.json: candidate PDFs to process.
- data/alerts.json: accumulated operational alerts, currently versioned in Git.
- src/lib/data.ts: data imports, trust lookup and list filtering. Hard-coded history import map contains 15 instruments; discovery does not extend it.
- src/lib/metrics.ts: derived metrics and scores.
- src/lib/format.ts: INR, percentages and date formatting.
- src/lib/types.ts: compile-time types; casting JSON to types is not runtime validation.

Critical historical defect: distributions/fundamentals were looked up by ISIN although the JSONs use symbols. Fixing those lookups restored displayed data. Do not reintroduce this mixed-key regression.

## 7. Sources and actual automation coverage

### Prices

The visible seed came from BSE-labeled EOD data dated 7 September. The current updater targets Upstox v2 historical candles using NSE_EQ plus ISIN. It reads UPSTOX_ANALYTICS_TOKEN with UPSTOX_API_KEY as a legacy fallback. A secret named API_KEY must actually contain an Analytics bearer token, not an app/client API key. No credential values belong in docs, client code, logs or Git.

Upstox documentation identified a one-year read-only Analytics token for market/historical data, distinct from daily OAuth access tokens. Token rotation remains a real operational requirement. Exact permissions and public redistribution rights need independent confirmation; successful HTTP access is not a license.

refresh-prices.mjs skips missing ISINs, requests approximately 400 days, writes successful history files, and merges prices only after at least half of priceable trusts succeed. It now logs HTTP status/candle count/response size. Missing token exits without an alert. A 401 alerts and skips remaining calls. Nonempty candles count as success even if stale. Histories may already be written before the overall price gate fails. It has short delays, not a comprehensive retry/backoff or request-timeout implementation.

### Discovery

scripts/discover.mjs reads the NSE invitsreits announcements feed and warms a session. The feed was observed reachable from the sandbox and a GitHub run. It returns filing metadata and PDF URLs; it does not guarantee complete coverage of all trusts, all historical filings or newly listed units.

Unknown symbols become needsReview stubs. It does not resolve ISIN/BSE/type automatically and initially assigned lotSize 1 without evidence. This is candidate discovery, not full onboarding. There is no demonstrated exchange-master reconciliation, historical backfill or guaranteed catch-up after an outage. Date slicing creates malformed firstSeen/queue dates such as 16-Sep-202.

### Distribution parsing

scripts/parse-distributions.mjs uses pdftotext, with a pdf-parse fallback. Only scripts/parsers/generic.mjs exists; the promised set of per-trust templates was not delivered. Generic regex extraction is not proven across actual trust filings.

A known total with incomplete split may be stored with null components and an alert; complete extraction failure remains queued. Existing five trusts with no seeded distribution arrays: ANANTAM, CAPINVIT, CITIUSINVT, CUBEINVIT, RIIT.

The generic parser recognizes explicit Qn FYnn labels, not every natural-language quarter-ending form. Ex-date and payment-date extraction is not implemented there. URL deduplication is not event/quarter deduplication, and accepted incomplete rows may not be repaired automatically on future runs. Rows append unsorted. The Vertis sample was an NCD interest/record-date PDF, not unit DPU. Failure to extract from it does not prove correct classification or robust parsing.

### Fundamentals and Upstox

scripts/fundamentals.mjs calls company profile, key ratios and corporate actions by ISIN. Actual updates are marketCapCr plus metadata, not NAV/LTV/occupancy/NDCF/GAV. Shareholding fetch is claimed in comments but not implemented. Company coverage for REITs/InvITs and response-field interpretation were not authenticated end-to-end.

Corporate-action amounts are used for a divergence warning, not reliable component extraction. Promise-level catches convert API errors to null, preventing some outer 401 alert/stop logic from firing. Missing token can exit zero. Updating an asOf metadata field must not make unchanged older fundamentals appear fresh.

### Alerts and reliability

scripts/notify.mjs sends generic JSON to ALERT_WEBHOOK_URL, retains alerts on missing/failed webhook and clears on HTTP success. Generic JSON is not automatically compatible with Telegram, Slack or Discord. No successful external alert delivery was demonstrated. Persistent Git alerts create duplicate/history-growth and merge-conflict risks.

No complete retry policy, Retry-After handling, bounded exponential backoff, circuit breaker, per-request timeout, operational freshness test or end-to-end recovery test was demonstrated. The earlier promise of roughly 90% automation was an estimate without measured evidence, not an acceptance result.

## 8. Workflow status and permissions

The user manually added .github/workflows/refresh.yml after repeated 403 Resource not accessible by integration errors when the assistant tried to write workflow files. Normal code/data writes worked. This is a permission difference; do not repeatedly retry the same forbidden workflow write or work around it through hidden credentials.

Observed schedule: cron 15 12 * * 1-5 (17:45 IST weekdays), with workflow_dispatch. Job permissions include contents: write and concurrency group nightly-refresh. Node 20 deprecation warnings concern action runtime compatibility and are distinct from the demonstrated Git conflict and prerender failures. Do not blame every exit code on the warning.

Latest audit nuance: individual fetching/parsing/validation steps use continue-on-error. However, the newer commit step reruns node scripts/validate-data.mjs under set -euo pipefail before staging and after rebase. Thus validation is not entirely bypassed in the current file. The validator itself is incomplete.

The latest workflow contains special alert-only rebase-conflict resolution. Its embedded Python has an over-indented merged = [] line; that branch is liable to IndentationError when invoked. Normal no-conflict runs bypass it. No repair was made during this handover.

A plain git pull --rebase handles nonconflicting remote advances only. It cannot guarantee successful pushes and cannot silently resolve financial data conflicts. Never force-push main to make the workflow green. Existing [skip ci] commit messages and GitHub/Vercel trigger behavior must be verified rather than assumed.

## 9. Incident and commit timeline

7 September: research approved and artifacts produced. User approved v1 defaults, requested Developer agent. Delegation initially blocked by account setting, then user enabled and approved it. Build later appeared in the actual repository under a different name than planned.

8 September: Vercel attempts failed; 56899914 was reported as Node pin/methodology fix. Later 3eabbae explicitly stubbed methodology to isolate a build problem. Claims of a stale transit read causing the problem were not independently established.

14 September: user deployed https://reit-invit.vercel.app/. Browser inspection confirmed prices rendered but distributions/fundamentals were null/empty; chart showed Invalid Date; methodology was only a heading; Embassy had a misleading recently-listed empty state.

14 September patches:
- 64193a0: symbol-keyed distribution/fundamental lookup and date guard.
- 6d405c0: methodology restored, but published weights still do not match actual formulas.
- 403a3a: accidental destructive replacement of trust detail with See below.
- 6201131: full trust detail restored and empty-state adjusted.
- d939b88: 15 history files converted from yearless weekday/month/day labels to inferred ISO dates, matching weekdays.

Important: inferred year consistency is not independent source validation. Some historical data may precede reported listing dates; original listing, public offering and data provenance require reconciliation. A locally reported cc292bc fix was not the final pushed fix sequence.

16 September automation commits:
- e2a61d3: Analytics-token price updater.
- a1a95db: validator hardening.
- 07490af: discovery.
- 0f05305: distribution parser runner.
- dffb997: generic parser.
- eb8e445: fundamentals script.
- 496f54a: notification script.
- 8a62331: README automation update.
- 094dabf: UPSTOX_API_KEY fallback in price script.
- 39aa10e: user-added workflow.
- 97a4ab01: bot committed alerts, candidates and queue; distribution changes were serialization-only. Prices did not change.
- b0e39a5: missing-ISIN skips, priceable threshold, diagnostics and zero-candle alerts.

16 September push race: user log showed local bot commit e7cc534 rejected because remote main had advanced. That proves a Git push failure, NOT successful price retrieval. Its four changed files could have been alerts/candidates/queue/formatting. Earlier statements that fresh prices definitely existed were unsupported.

16 September prerender failure at c891457: compilation and type checks passed; static generation failed on home/calculator/portfolio/tax/compare with null.toUpperCase(). getAllTrustData passed null ISIN from candidates into getTrust. 35cb055 added null guards and filtered list views. Static params and direct detail paths were not comprehensively gated by that patch: lookup by a candidate's non-null symbol can still find the raw stub. The earlier claim all such pages necessarily hit notFound was inaccurate.

16 September later rebase failure: local fb25522 changed only alerts; rebase conflicted in data/alerts.json. Assistant proposed combining alert arrays and stopping on other conflicts, but the user's latest report remained Not working.

17 September latest audit: main df7e354 contains an alerts-only bot update. User halts work and requests this handover.

## 10. Verified UI behavior versus product correctness

Observed on 14 September after patches: home shows populated financial columns for seed trusts; Embassy detail displays distribution rows/charts and dated NAV; two-name comparison works; methodology body renders. Earlier compare failure claims were test mistakes caused by toggling the same button on and off. Static export does support hydrated client components; it was not evidence of a general hydration defect.

Portfolio page and tax page were inspected, but comprehensive input edge-case, persistence, mobile, accessibility, tax-law and numeric regression testing was not completed. A desktop 1280px screenshot is not mobile verification. Showing a live home page after a failed build does not prove the new commit deployed: Vercel can keep serving the previous successful deployment.

Rendering seed figures is not validation of their source accuracy. Several sources are secondary portals or board-meeting notices, not confirmed payout declarations. Some price changes disagree with current/previous closes. Treat existing data as needing an evidence audit before investment use.

## 11. Known calculation, tax and regulatory defects

TTM: computeDerivedMetrics takes up to four latest quarter labels and sums any available entries. MINDSPACE has three and BAGMANE one. No requirement for four consecutive quarters, current trailing dates or completeness. Thus an incomplete history can be mislabeled TTM and projected as annual income.

Components: unknown RoC becomes zero; missing splits can inflate recurring-yield figures and understate tax. A partially known split should not be represented as a fully known taxable distribution. A total and component sum matching within tolerance does not verify reporting period, instrument identity or source authenticity.

Scores: SCORECARD_WEIGHTS and published tables are not actually used by computeScorecards. Current income = capped yield score minus twice RoC percentage. Value uses NAV discount alone. Safety uses 60% LTV and 40% occupancy, inventing 80 for missing occupancy. Growth uses unsorted slices and requires eight rows. There is no peer-relative normalization despite the wording. All existing seeded arrays have fewer than eight quarters; growth is null. NDCF coverage, sponsor quality, concession strength and sector outlook are not implemented inputs.

Tax: previous summaries and UI copy require review. SPV concessional-tax treatment was described inconsistently, and some checkbox instructions appear reversed. Principal repayment is not universally tax-free: specified-sum and cost-basis rules matter. The prior claim that a Finance Act 2025 change creates a new FY2026-27-only unitholder LTCG threshold conflated assessment years and trust-level provisions; do not encode it as established law. Holding-period boundaries, shared annual exemption usage, cess/surcharge, investor type and applicable law dates need tests and primary-source validation. TDS is a credit/withholding, not final liability.

Legal: public EOD data is not automatically free to redistribute, nor does hiding live quotes settle licensing. HTTP 200 from an unauthenticated or dummy-token request does not establish a supported authentication policy or validate the user's actual token. Scorecard labels/disclaimers do not themselves settle SEBI RA/IA obligations. No legal or tax compliance sign-off was obtained.

## 12. Pending work — do not mark complete without evidence

Priority 0, reliability:
- Reproduce actual price-step failure with authorized logs; stop asserting token, date window or IP-block root causes without evidence.
- Fix workflow conflict policy, validate its executable branches, and prove invalid data cannot publish.
- Separate discovered candidates from approved instruments; enforce validation before all pages, routes and price jobs.
- Resolve candidate identity/type/lot/listing status automatically from authoritative sources before promotion.
- Record per-stage outcomes and freshness, not just green job status.

Priority 1, data and calculations:
- Audit all seeded financial facts and identifiers against actual primary disclosures.
- Backfill the five missing distribution histories; resolve missing quarters/components for existing names.
- Implement correct complete-period versus partial-period metrics; never treat unknown components as zero.
- Make published methodology match the code, or disable unsupported scores.
- Implement actual NAV/LTV/occupancy/NDCF updates and source-specific timestamps.
- Add robust unit-distribution-versus-NCD classification and real PDF fixtures; handle revisions and deduplication by event.
- Fix queue dates, catch-up windows, automatic retry of incomplete parses and hard-coded history imports.

Priority 2, operations and release:
- Request timeouts, bounded Retry-After-aware retries, rate budgets and last-good promotion by validated dataset.
- Durable alert delivery and deduplication without racing on one Git JSON file.
- Token expiry monitoring and secure rotation; no credentials pasted in chat.
- Measured free-tier usage, bounded file/alert retention and scan cadence.
- End-to-end scheduled run, fresh snapshot committed, deployment SHA matched, pages interacted with, numeric assertions passed.
- Preserve original JSON as rollback/migration source; never overwrite good facts with unverified extraction.

## 13. Convex decision

User asked about Convex database plus crons. Discussion correctly identified that actions can fetch third-party HTTP data and crons are available, but earlier opposition overstated the case. Convex is feasible for a small low-traffic dataset on free allowances; it is not inherently incompatible with zero recurring cost. Shared team caps and operational usage must be measured. Public-data queries do not inherently require user auth.

Migration would replace Git data commits with validated database mutations and runtime/cached reads, require secure internal ingestion, explicit job state, retry scheduling, and reconsider PDF tooling (do not assume a managed runtime supports apt-get/poppler). It would not itself fix wrong endpoint mappings, token setup, parsers, formulas or data licensing.

Latest user choice before the pause was Fix prices on current stack. No Convex migration was authorized or performed. Keep this as a documented alternative, not an automatic next action.

## 14. Source register and historical artifacts

Use these to resume verification; links are research starting points, not blanket validation of every seed value:
- Upstox Analytics token: https://upstox.com/developer/api-documentation/analytics-token
- Upstox historical candles: https://upstox.com/developer/api-documentation/get-historical-candle-data
- Upstox corporate actions: https://upstox.com/developer/api-documentation/get-corporate-actions
- Upstox key ratios: https://upstox.com/developer/api-documentation/get-key-ratios
- Upstox company profile: https://upstox.com/developer/api-documentation/get-company-profile
- NSE trust announcements: https://www.nseindia.com/companies-listing/corporate-filings-announcements
- NSE unitholding: https://nseindia.com/companies-listing/corporate-filings-unitholding-pattern
- Nifty factsheet: https://www.niftyindices.com/Factsheet/Factsheet_REITs_InvITs.pdf
- BSE index: https://www.bseindices.com/indices-details/code/1053/
- BSE data tariff: https://www.bseindia.com/downloads1/Information_Products_Pricing_Sheet.pdf
- Indian REITs Association: https://indianreitsassociation.com/data/
- Embassy IR: https://www.embassyofficeparks.com/investors/
- Mindspace presentations: https://www.mindspacereit.com/investor-relations/presentations
- Brookfield: https://www.brookfieldindiareit.in/
- SEBI InvIT NDCF update: https://www.sebi.gov.in/legal/circulars/aug-2026/framework-for-calculation-of-net-distributable-cash-flows-for-invits_103644.html
- Finance Bill 2025 memorandum: https://www.indiabudget.gov.in/budget2025-26/doc/memo.pdf
- Convex official limits: https://docs.convex.dev/production/state/limits.md
- Convex pricing FAQ: https://www.convex.dev/pricing/faq

Competitors reviewed: reitinvittracker.com (direct specialist; free core analytics, advertised Pro portfolio/tax/alerts), invtrustinfo.com (tables and education), IRA (association cross-check), AllPaisa (distribution calendar), Moneycontrol/Trendlyne/Screener/Tickertape (general equity tools), ET Money (educational comparisons). Absence of a feature on a homepage was not an exhaustive competitor audit.

Earlier thread artifacts for provenance: requirements document cmtrdls0k0nse06ads4r2ai1q; research table cmtrde2i60ndc07ad1g4nrkmx; HTML report cmtrdkb560pqz06ad2owp4dly. These contain superseded or unverified claims. This handover's corrections take precedence for restart planning; primary sources and current code remain authoritative for facts.

## 15. Restart acceptance criteria

A future engineer should first read this handover and audit the then-current main SHA. Do not label the work fully fixed based on syntax checks, a visible homepage, parsed YAML, or a bot commit.

Completion requires: a scheduled run retrieves dated provider records; only eligible instruments are published; validated complete and partial data remain distinguishable; revisions and retries do not duplicate distributions; malformed or conflicting financial data cannot publish; alerts reach the configured destination; the deployed SHA is confirmed; all affected pages and calculators pass behavioral and numerical tests. Unavailable data must remain unavailable rather than be invented.

Status at pause: implementation exists, key rendering bugs were patched, and the workflow can execute and commit alerts. Reliable fresh prices, comprehensive automatic fundamentals, complete PDF coverage, safe automatic onboarding and fully tested tax/comparison correctness remain unproven or incomplete.
