"use client";

import { useMemo, useState } from "react";
import { formatINR, formatNum, parseINRInput } from "@/lib/format";
import { computeTax, SLAB_RATES, type SlabRate } from "@/lib/tax";

interface Option {
  symbol: string;
  name: string;
  type: string;
  price: number | null;
  ttmDpu: number | null;
  recurringDpu: number | null;
  ttmInterest: number | null;
  ttmDividend: number | null;
  ttmRoc: number | null;
  ttmOther: number | null;
}

type Scenario = "bear" | "base" | "bull";
const SCENARIO_MULT: Record<Scenario, number> = { bear: 0.85, base: 1.0, bull: 1.1 };

export function Calculator({ options }: { options: Option[] }) {
  const [symbol, setSymbol] = useState(options[0]?.symbol ?? "");
  const [mode, setMode] = useState<"units" | "amount">("amount");
  const [unitsRaw, setUnitsRaw] = useState("1000");
  const [amountRaw, setAmountRaw] = useState("100000");
  const [slab, setSlab] = useState<SlabRate>(30);
  const [scenario, setScenario] = useState<Scenario>("base");

  const opt = options.find((o) => o.symbol === symbol);

  const result = useMemo(() => {
    if (!opt || opt.price == null || opt.ttmDpu == null) return null;

    let units: number;
    let invested: number;
    if (mode === "units") {
      units = parseFloat(unitsRaw) || 0;
      invested = units * opt.price;
    } else {
      invested = parseINRInput(amountRaw) || 0;
      units = opt.price > 0 ? invested / opt.price : 0;
    }
    if (units <= 0) return null;

    const mult = SCENARIO_MULT[scenario];
    const grossAnnual = opt.ttmDpu * units * mult;

    // Component split scaled to the scenario
    const interest = (opt.ttmInterest ?? 0) * units * mult;
    const dividend = (opt.ttmDividend ?? 0) * units * mult;
    const roc = (opt.ttmRoc ?? 0) * units * mult;
    const other = (opt.ttmOther ?? 0) * units * mult;

    const tax = computeTax({ interest, dividend, returnOfCapital: roc, other, slabRate: slab });

    return { units, invested, grossAnnual, interest, dividend, roc, other, tax };
  }, [opt, mode, unitsRaw, amountRaw, slab, scenario]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Inputs */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">Trust</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {options.map((o) => (
              <option key={o.symbol} value={o.symbol}>
                {o.name} ({o.type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {(["amount", "units"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === m ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {m === "amount" ? "₹ Amount" : "Units"}
            </button>
          ))}
        </div>

        {mode === "amount" ? (
          <div>
            <label className="text-sm font-medium block mb-1.5">Investment amount</label>
            <input
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              placeholder="e.g. 100000 or 1 lakh"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm tnum"
            />
            <p className="text-xs text-muted-foreground mt-1">Accepts &quot;1 lakh&quot;, &quot;2.5 cr&quot;, or plain numbers.</p>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium block mb-1.5">Number of units</label>
            <input
              value={unitsRaw}
              onChange={(e) => setUnitsRaw(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm tnum"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium block mb-1.5">Your income tax slab</label>
          <div className="flex gap-1.5 flex-wrap">
            {SLAB_RATES.map((r) => (
              <button
                key={r}
                onClick={() => setSlab(r)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  slab === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">Scenario (distribution varies)</label>
          <div className="flex gap-1.5">
            {(["bear", "base", "bull"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                  scenario === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                }`}
              >
                {s} {s === "bear" ? "(−15%)" : s === "bull" ? "(+10%)" : ""}
              </button>
            ))}
          </div>
        </div>

        {opt && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            <div>Price (EOD): {formatINR(opt.price)}</div>
            <div>TTM DPU: {formatINR(opt.ttmDpu)} /unit</div>
            <div>Recurring DPU (excl. RoC): {formatINR(opt.recurringDpu)} /unit</div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="rounded-lg border border-border bg-card p-5">
        {result ? (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Estimated annual distribution (gross)</div>
              <div className="text-3xl font-bold tnum mt-1">{formatINR(result.grossAnnual)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatNum(result.units, 0)} units · {formatINR(result.invested)} invested ·{" "}
                {result.invested > 0 ? ((result.grossAnnual / result.invested) * 100).toFixed(2) : "—"}% yield
              </div>
            </div>

            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <Row label="Interest (taxed at slab)" value={result.interest} tax={result.tax.interestTax} />
                <Row label="Dividend (tax rules vary)" value={result.dividend} tax={result.tax.dividendTax} />
                <Row label="Return of capital (not income)" value={result.roc} tax={0} />
                <Row label="Other income" value={result.other} tax={result.tax.otherTax} />
              </tbody>
            </table>

            <div className="rounded-lg bg-muted/60 p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total tax (est.)</span>
                <span className="tnum font-medium text-red-600 dark:text-red-400">
                  −{formatINR(result.tax.totalTax)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Post-tax annual cash</span>
                <span className="text-xl font-bold tnum text-green-600 dark:text-green-400">
                  {formatINR(result.tax.postTaxIncome)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Effective tax on distributions: {result.tax.effectiveRate.toFixed(1)}% · Post-tax yield:{" "}
                {result.invested > 0 ? ((result.tax.postTaxIncome / result.invested) * 100).toFixed(2) : "—"}%
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              TDS of 10% is deducted u/s 194LBA on taxable components — settle the difference when
              filing. Return of capital reduces your cost basis (matters when you sell). This is an
              educational estimate, not tax advice.
            </p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-12">
            {opt?.ttmDpu == null
              ? "This trust hasn't published a full year of distributions yet — pick another trust."
              : "Enter an amount or units to see the estimate."}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, tax }: { label: string; value: number; tax: number }) {
  return (
    <tr>
      <td className="py-2 pr-2 text-muted-foreground">{label}</td>
      <td className="py-2 tnum text-right">{formatINR(value)}</td>
      <td className="py-2 tnum text-right text-muted-foreground w-24">
        {tax > 0 ? `−${formatINR(tax)}` : "—"}
      </td>
    </tr>
  );
}
