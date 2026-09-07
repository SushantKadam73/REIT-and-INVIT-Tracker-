"use client";

import { useEffect, useMemo, useState } from "react";
import { formatINR, formatPct, formatNum } from "@/lib/format";
import { computeTax, SLAB_RATES, type SlabRate } from "@/lib/tax";

interface Option {
  isin: string;
  symbol: string;
  name: string;
  type: string;
  sector: string;
  price: number | null;
  ttmDpu: number | null;
  recurringDpu: number | null;
  ttmInterest: number | null;
  ttmDividend: number | null;
  ttmRoc: number | null;
  ttmOther: number | null;
}

interface Holding {
  isin: string;
  units: number;
  avgBuy: number;
}

const STORAGE_KEY = "reit-invit-portfolio-v1";

export function Portfolio({ options }: { options: Option[] }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [symbol, setSymbol] = useState(options[0]?.symbol ?? "");
  const [units, setUnits] = useState("");
  const [avgBuy, setAvgBuy] = useState("");
  const [slab, setSlab] = useState<SlabRate>(30);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHoldings(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings, loaded]);

  const addHolding = () => {
    const opt = options.find((o) => o.symbol === symbol);
    const u = parseFloat(units);
    const p = parseFloat(avgBuy) || opt?.price || 0;
    if (!opt || !u || u <= 0) return;
    setHoldings((h) => {
      const existing = h.find((x) => x.isin === opt.isin);
      if (existing) {
        // merge: weighted average buy price
        const totalUnits = existing.units + u;
        const avg = (existing.units * existing.avgBuy + u * p) / totalUnits;
        return h.map((x) => (x.isin === opt.isin ? { isin: opt.isin, units: totalUnits, avgBuy: avg } : x));
      }
      return [...h, { isin: opt.isin, units: u, avgBuy: p }];
    });
    setUnits("");
    setAvgBuy("");
  };

  const removeHolding = (isin: string) => setHoldings((h) => h.filter((x) => x.isin !== isin));

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalInvested = 0;
    let grossIncome = 0;
    let interest = 0;
    let dividend = 0;
    let roc = 0;
    let otherInc = 0;
    const sectorMap: Record<string, number> = {};

    const rows = holdings.map((h) => {
      const opt = options.find((o) => o.isin === h.isin);
      if (!opt || opt.price == null) return null;
      const value = h.units * opt.price;
      const invested = h.units * h.avgBuy;
      const pnl = value - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const income = (opt.ttmDpu || 0) * h.units;

      totalValue += value;
      totalInvested += invested;
      grossIncome += income;
      interest += (opt.ttmInterest || 0) * h.units;
      dividend += (opt.ttmDividend || 0) * h.units;
      roc += (opt.ttmRoc || 0) * h.units;
      otherInc += (opt.ttmOther || 0) * h.units;
      sectorMap[opt.sector] = (sectorMap[opt.sector] || 0) + value;

      return { h, opt, value, invested, pnl, pnlPct, income };
    }).filter(Boolean) as { h: Holding; opt: Option; value: number; invested: number; pnl: number; pnlPct: number; income: number }[];

    const tax = computeTax({ interest, dividend, returnOfCapital: roc, other: otherInc, slabRate: slab });
    const blendedYield = totalValue > 0 ? (grossIncome / totalValue) * 100 : 0;
    const postTaxYield = totalValue > 0 ? (tax.postTaxIncome / totalValue) * 100 : 0;

    return { rows, totalValue, totalInvested, grossIncome, tax, blendedYield, postTaxYield, sectorMap };
  }, [holdings, options, slab]);

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm tnum";

  return (
    <div className="space-y-6">
      {/* Add holding */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="grid sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Trust</label>
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                const p = options.find((o) => o.symbol === e.target.value)?.price;
                if (p) setAvgBuy(p.toFixed(2));
              }}
              className={inputCls}
            >
              {options.map((o) => (
                <option key={o.symbol} value={o.symbol}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Units</label>
            <input value={units} onChange={(e) => setUnits(e.target.value)} className={inputCls} inputMode="numeric" placeholder="100" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Avg buy price</label>
            <input value={avgBuy} onChange={(e) => setAvgBuy(e.target.value)} className={inputCls} inputMode="decimal" placeholder="defaults to EOD" />
          </div>
          <button
            onClick={addHolding}
            className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            Add
          </button>
        </div>
      </div>

      {summary.rows.length > 0 && (
        <>
          {/* Holdings table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Trust</th>
                  <th className="px-3 py-2 font-medium">Units</th>
                  <th className="px-3 py-2 font-medium">Avg Buy</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">P&amp;L</th>
                  <th className="px-3 py-2 font-medium">Est. Annual Income</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {summary.rows.map(({ h, opt, value, pnl, pnlPct, income }) => (
                  <tr key={h.isin} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{opt.name}</div>
                      <div className="text-xs text-muted-foreground">{opt.sector}</div>
                    </td>
                    <td className="px-3 py-2 tnum">{formatNum(h.units, 0)}</td>
                    <td className="px-3 py-2 tnum">{formatINR(h.avgBuy)}</td>
                    <td className="px-3 py-2 tnum">{formatINR(value)}</td>
                    <td className={`px-3 py-2 tnum ${pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {formatINR(pnl)} ({formatPct(pnlPct)})
                    </td>
                    <td className="px-3 py-2 tnum">{formatINR(income)}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeHolding(h.isin)}
                        className="text-xs text-muted-foreground hover:text-red-500"
                        aria-label={`Remove ${opt.name}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card label="Portfolio value" value={formatINR(summary.totalValue, { compact: true })} sub={`invested ${formatINR(summary.totalInvested, { compact: true })}`} />
            <Card
              label="Unrealised P&L"
              value={formatINR(summary.totalValue - summary.totalInvested, { compact: true })}
              sub={summary.totalInvested > 0 ? formatPct(((summary.totalValue - summary.totalInvested) / summary.totalInvested) * 100) : ""}
              colored
            />
            <Card label="Expected annual income" value={formatINR(summary.grossIncome)} sub={`blended yield ${summary.blendedYield.toFixed(2)}%`} />
            <Card
              label={`Post-tax income @ ${slab}% slab`}
              value={formatINR(summary.tax.postTaxIncome)}
              sub={`post-tax yield ${summary.postTaxYield.toFixed(2)}%`}
            />
          </div>

          {/* Slab picker + sector mix */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm font-medium mb-2">Your tax slab</div>
              <div className="flex gap-1.5 flex-wrap">
                {SLAB_RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSlab(r)}
                    className={`px-3 py-1.5 rounded-md text-sm ${
                      slab === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-3">
                Tax est.: interest −{formatINR(summary.tax.interestTax)} · dividend −
                {formatINR(summary.tax.dividendTax)} · other −{formatINR(summary.tax.otherTax)} ·
                return of capital untaxed
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm font-medium mb-2">Sector mix (by value)</div>
              <div className="space-y-1.5">
                {Object.entries(summary.sectorMap)
                  .sort((a, b) => b[1] - a[1])
                  .map(([sector, v]) => {
                    const pct = summary.totalValue > 0 ? (v / summary.totalValue) * 100 : 0;
                    return (
                      <div key={sector}>
                        <div className="flex justify-between text-xs">
                          <span>{sector}</span>
                          <span className="tnum">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </>
      )}

      {summary.rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Add your first holding above. Your portfolio is saved only in this browser.
        </div>
      )}
    </div>
  );
}

function Card({ label, value, sub, colored }: { label: string; value: string; sub: string; colored?: boolean }) {
  const negative = colored && value.startsWith("−");
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold tnum mt-1 ${colored ? (negative ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400") : ""}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
