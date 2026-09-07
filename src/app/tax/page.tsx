import { getAllTrustData } from "@/lib/data";
import { TaxSimulator } from "@/components/TaxSimulator";

export const metadata = { title: "Tax Simulator — REIT/InvIT Tracker" };

export default function TaxPage() {
  const options = getAllTrustData().map((d) => ({
    symbol: d.trust.nseSymbol,
    name: d.trust.name,
    type: d.trust.type,
    price: d.price?.price ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tax simulator</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          How REIT/InvIT distributions and capital gains are taxed for a resident Indian individual
          (FY2026-27 rules). Educational only — not tax advice.
        </p>
      </div>

      <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
        <strong>Plain-English summary:</strong> interest and rent components are taxed at your slab
        rate (10% TDS is deducted upfront). Dividends are exempt for most trusts but taxable for
        some — when in doubt, assume taxable. Return of capital is not taxed now; it reduces your
        cost basis, so you pay more capital gains tax when you eventually sell. Gains on units held
        over 12 months are taxed at 12.5% after a ₹1.25 lakh annual exemption; under 12 months, 20%.
      </div>

      <TaxSimulator options={options} />
    </div>
  );
}
