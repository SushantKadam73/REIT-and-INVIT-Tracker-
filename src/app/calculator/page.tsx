import { getAllTrustData } from "@/lib/data";
import { computeDerivedMetrics } from "@/lib/metrics";
import { Calculator } from "@/components/Calculator";

export const metadata = { title: "Income Calculator — REIT/InvIT Tracker" };

export default function CalculatorPage() {
  const options = getAllTrustData().map((d) => {
    const m = computeDerivedMetrics(d);
    return {
      symbol: d.trust.nseSymbol,
      name: d.trust.name,
      type: d.trust.type,
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Income calculator</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Estimate the annual cash distribution from a holding, and what you keep after tax.
          Based on trailing distributions — not a forecast.
        </p>
      </div>
      <Calculator options={options} />
    </div>
  );
}
