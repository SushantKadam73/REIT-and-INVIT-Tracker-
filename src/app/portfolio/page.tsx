import { getAllTrustData } from "@/lib/data";
import { computeDerivedMetrics } from "@/lib/metrics";
import { Portfolio } from "@/components/Portfolio";

export const metadata = { title: "Portfolio Simulator — REIT/InvIT Tracker" };

export default function PortfolioPage() {
  const options = getAllTrustData().map((d) => {
    const m = computeDerivedMetrics(d);
    return {
      isin: d.trust.isin,
      symbol: d.trust.nseSymbol,
      name: d.trust.name,
      type: d.trust.type,
      sector: d.trust.sector,
      price: d.price?.price ?? null,
      ttmDpu: m.ttmDpu,
      recurringDpu: m.recurringDpu,
      ttmInterest: m.ttmInterest,
      ttmDividend: m.ttmDividend,
      ttmRoc: m.ttmRoc,
      ttmOther: m.ttmOther,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Portfolio simulator</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Build a hypothetical REIT/InvIT portfolio. Everything stays in your browser
          (localStorage) — no account, nothing is sent anywhere.
        </p>
      </div>
      <Portfolio options={options} />
    </div>
  );
}
