import { getAllTrustData } from "@/lib/data";
import { HomeTables } from "@/components/HomeTables";
import { computeDerivedMetrics } from "@/lib/metrics";

export default function HomePage() {
  const all = getAllTrustData();

  const rows = all.map((d) => ({
    data: d,
    metrics: computeDerivedMetrics(d),
  }));

  const reits = rows.filter((r) => r.data.trust.type === "REIT");
  const invits = rows.filter((r) => r.data.trust.type === "InvIT");

  // Data freshness — the newest price asOf across the universe
  const asOfDates = all.map((d) => d.price?.asOf).filter(Boolean) as string[];
  const latestAsOf = asOfDates.sort().pop() || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Indian REITs &amp; InvITs
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Every listed trust, end-of-day prices, honest distribution breakdowns.{" "}
          {latestAsOf && (
            <>
              Prices as of <span className="font-medium text-foreground">{latestAsOf}</span> (EOD).
            </>
          )}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        REITs are compared only with REITs, InvITs only with InvITs — they are different
        asset classes with different risk profiles. No trust is ever ranked &quot;#1 overall&quot;.
      </div>

      <HomeTables reits={reits} invits={invits} />
    </div>
  );
}
