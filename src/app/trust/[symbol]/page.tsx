import { notFound } from "next/navigation";
import { getTrustDataAsync, trusts } from "@/lib/data";
import { computeDerivedMetrics, computeScorecards } from "@/lib/metrics";
import { formatINR, formatPct, formatPctPlain, formatDate, daysSince } from "@/lib/format";
import { PriceSparkline } from "@/components/PriceSparkline";
import { DistributionChart } from "@/components/DistributionChart";
import { Scorecards } from "@/components/Scorecards";

// Pre-render every trust page at build time (static export)
export function generateStaticParams() {
  return trusts.map((t) => ({ symbol: t.nseSymbol }));
}

export async function generateMetadata({ params }: { params: { symbol: string } }) {
  return { title: `${params.symbol} — REIT/InvIT Tracker` };
}

export default async function TrustPage({ params }: { params: { symbol: string } }) {
  const data = await getTrustDataAsync(params.symbol);
  if (!data) notFound();

  const { trust, price, fundamentals: f, distributions, history } = data;
  const metrics = computeDerivedMetrics(data);
  const scores = computeScorecards(data);

  const last90 = history.slice(-90);
  const navStale = daysSince(f?.navDate);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {trust.type} · {trust.sector}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{trust.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {trust.nseSymbol} · BSE {trust.bseCode} · Sponsor: {trust.sponsor} · Listed{" "}
            {formatDate(trust.listedDate)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tnum">{formatINR(price?.price)}</div>
          <div
            className={`text-sm tnum ${
              (price?.change1d ?? 0) > 0
                ? "text-green-600 dark:text-green-400"
                : (price?.change1d ?? 0) < 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {formatPct(price?.change1d)} today
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            EOD {formatDate(price?.asOf)} · {price?.source}
          </div>
        </div>
      </div>

      {/* Price sparkline */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Price — last {last90.length} trading days (EOD)
        </h2>
        <PriceSparkline data={last90} nav={f?.navPerUnit ?? null} />
      </section>

      {/* Key stats */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "TTM Yield", value: formatPctPlain(metrics.ttmYield), sub: "last 4 qtrs DPU ÷ price" },
          { label: "Recurring Yield", value: formatPctPlain(metrics.recurringYield), sub: "excl. return of capital" },
          {
            label: "vs NAV",
            value: metrics.navPremiumPct != null ? formatPct(metrics.navPremiumPct) : "—",
            sub: f?.navDate ? `NAV ${formatDate(f.navDate)}${navStale != null && navStale > 120 ? " (stale)" : ""}` : "NAV not published",
          },
          { label: "LTV", value: f?.ltv != null ? `${f.ltv.toFixed(1)}%` : "—", sub: "leverage" },
          {
            label: trust.type === "REIT" ? "Occupancy" : "Concession life",
            value:
              trust.type === "REIT"
                ? f?.occupancy != null
                  ? `${f.occupancy.toFixed(1)}%`
                  : "—"
                : f?.concessionLifeYears != null
                ? `${f.concessionLifeYears.toFixed(1)} yrs`
                : "—",
            sub: trust.type === "REIT" ? "committed" : "weighted avg remaining",
          },
          {
            label: "Mkt Cap",
            value: f?.marketCapCr ? `₹${f.marketCapCr.toLocaleString("en-IN")} cr` : "—",
            sub: "approx.",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-lg font-semibold tnum mt-0.5">{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Distributions */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Distribution history</h2>
          <div className="text-xs text-muted-foreground">
            TTM DPU: <span className="font-medium text-foreground">{formatINR(metrics.ttmDpu)}</span>{" "}
            /unit · of which return of capital:{" "}
            <span className="font-medium text-foreground">{formatINR(metrics.ttmRoc)}</span>
            {metrics.splitCoverage < 1 && metrics.splitCoverage > 0 && (
              <span className="text-amber-500 ml-2">
                ({Math.round(metrics.splitCoverage * 100)}% of quarters have component breakdown)
              </span>
            )}
          </div>
        </div>

        {distributions.length > 0 ? (
          <>
            <div className="rounded-lg border border-border bg-card p-4">
              <DistributionChart distributions={distributions} />
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Quarter</th>
                    <th className="px-3 py-2 font-medium">Total DPU</th>
                    <th className="px-3 py-2 font-medium">Interest</th>
                    <th className="px-3 py-2 font-medium">Dividend</th>
                    <th className="px-3 py-2 font-medium">Return of Capital</th>
                    <th className="px-3 py-2 font-medium">Other</th>
                    <th className="px-3 py-2 font-medium">Record Date</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[...distributions].reverse().map((d, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{d.quarter}</td>
                      <td className="px-3 py-2 tnum font-medium">{formatINR(d.totalDPU)}</td>
                      <td className="px-3 py-2 tnum">{d.interest != null ? formatINR(d.interest) : "—"}</td>
                      <td className="px-3 py-2 tnum">{d.dividend != null ? formatINR(d.dividend) : "—"}</td>
                      <td className="px-3 py-2 tnum">
                        {d.returnOfCapital != null ? formatINR(d.returnOfCapital) : "—"}
                      </td>
                      <td className="px-3 py-2 tnum">{d.other != null ? formatINR(d.other) : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {formatDate(d.recordDate)}
                      </td>
                      <td className="px-3 py-2">
                        {d.sourceUrl ? (
                          <a
                            href={d.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 underline text-xs"
                          >
                            filing
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Interest is taxed at your slab. Dividend may be exempt (depends on the trust&apos;s SPV
              tax regime). Return of capital is not income — it reduces your cost basis. See the{" "}
              <a href="/tax/" className="underline">tax simulator</a>.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No distribution history yet — this trust listed recently ({formatDate(trust.listedDate)}).
          </div>
        )}
      </section>

      {/* Profile scorecards */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Profile scorecards</h2>
        <Scorecards scores={scores} type={trust.type} />
        <p className="text-xs text-muted-foreground">
          Scores compare within {trust.type}s only. Weights and formulas:{" "}
          <a href="/methodology/" className="underline">methodology</a>. Not investment advice.
        </p>
      </section>

      {/* Fundamentals with sources */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fundamentals</h2>
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
          <Row label="NAV per unit" value={f?.navPerUnit != null ? formatINR(f.navPerUnit) : "—"} date={f?.navDate} />
          <Row label="Gross Asset Value (GAV)" value={f?.gavCr ? `₹${f.gavCr.toLocaleString("en-IN")} cr` : "—"} />
          <Row label="Loan-to-Value (LTV)" value={f?.ltv != null ? `${f.ltv.toFixed(1)}%` : "—"} />
          {trust.type === "REIT" ? (
            <Row label="Occupancy" value={f?.occupancy != null ? `${f.occupancy.toFixed(1)}%` : "—"} />
          ) : (
            <Row
              label="Remaining concession life"
              value={f?.concessionLifeYears != null ? `${f.concessionLifeYears.toFixed(1)} years` : "—"}
            />
          )}
          {f?.notes && <p className="text-xs text-muted-foreground pt-2">{f.notes}</p>}
          {f?.sourceUrl && (
            <p className="text-xs pt-1">
              Source:{" "}
              <a
                href={f.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 underline break-all"
              >
                official disclosure
              </a>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, date }: { label: string; value: string; date?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="tnum text-right">
        {value}
        {date && <span className="block text-[10px] text-muted-foreground">as of {formatDate(date)}</span>}
      </span>
    </div>
  );
}
