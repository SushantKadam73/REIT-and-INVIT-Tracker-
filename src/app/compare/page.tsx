import { getAllTrustData } from "@/lib/data";
import { computeDerivedMetrics, computeScorecards } from "@/lib/metrics";
import { CompareClient } from "@/components/CompareClient";

export const metadata = { title: "Compare — REIT/InvIT Tracker" };

export default function ComparePage() {
  const rows = getAllTrustData().map((d) => ({
    isin: d.trust.isin,
    symbol: d.trust.nseSymbol,
    name: d.trust.name,
    type: d.trust.type,
    sector: d.trust.sector,
    price: d.price?.price ?? null,
    priceDate: d.price?.asOf ?? null,
    metrics: computeDerivedMetrics(d),
    scores: computeScorecards(d),
    fundamentals: d.fundamentals,
    dpuQuarters: d.distributions.length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Compare trusts</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Pick 2–4 trusts of the same type. REITs and InvITs are never mixed — they are different
          asset classes.
        </p>
      </div>
      <CompareClient rows={rows} />
    </div>
  );
}
