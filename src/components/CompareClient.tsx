"use client";

import { useState } from "react";
import { formatINR, formatPct, formatPctPlain, formatDate } from "@/lib/format";
import type { DerivedMetrics, Fundamentals, TrustType } from "@/lib/types";

interface Row {
  isin: string;
  symbol: string;
  name: string;
  type: TrustType;
  sector: string;
  price: number | null;
  priceDate: string | null;
  metrics: DerivedMetrics;
  scores: { income: number | null; value: number | null; safety: number | null; growth: number | null };
  fundamentals: Fundamentals | null;
  dpuQuarters: number;
}

export function CompareClient({ rows }: { rows: Row[] }) {
  const [type, setType] = useState<TrustType>("REIT");
  const [selected, setSelected] = useState<string[]>([]);

  const pool = rows.filter((r) => r.type === type);
  const chosen = pool.filter((r) => selected.includes(r.isin));

  const toggle = (isin: string) => {
    setSelected((s) =>
      s.includes(isin) ? s.filter((x) => x !== isin) : s.length < 4 ? [...s, isin] : s
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1.5">
          {(["REIT", "InvIT"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setSelected([]);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                type === t ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {t}s
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {pool.map((r) => (
            <button
              key={r.isin}
              onClick={() => toggle(r.isin)}
              className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                selected.includes(r.isin)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.symbol}
            </button>
          ))}
        </div>
      </div>

      {chosen.length >= 2 ? (
        <>
          {/* Metric table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Metric</th>
                  {chosen.map((r) => (
                    <th key={r.isin} className="px-3 py-2.5 font-medium">
                      {r.symbol}
                      <div className="text-[10px] font-normal text-muted-foreground">{r.sector}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <MetricRow label="Price (EOD)" values={chosen.map((r) => formatINR(r.price))} />
                <MetricRow label="TTM Yield" values={chosen.map((r) => formatPctPlain(r.metrics.ttmYield))} best={bestIdx(chosen.map((r) => r.metrics.ttmYield), true)} />
                <MetricRow label="Recurring Yield" values={chosen.map((r) => formatPctPlain(r.metrics.recurringYield))} best={bestIdx(chosen.map((r) => r.metrics.recurringYield), true)} />
                <MetricRow label="TTM DPU /unit" values={chosen.map((r) => formatINR(r.metrics.ttmDpu))} />
                <MetricRow label="Return-of-capital share" values={chosen.map((r) => r.metrics.rocSharePct != null ? `${r.metrics.rocSharePct.toFixed(0)}%` : "—")} best={bestIdx(chosen.map((r) => r.metrics.rocSharePct), false)} />
                <MetricRow label="vs NAV" values={chosen.map((r) => formatPct(r.metrics.navPremiumPct))} best={bestIdx(chosen.map((r) => r.metrics.navPremiumPct), false)} />
                <MetricRow label="NAV date" values={chosen.map((r) => formatDate(r.fundamentals?.navDate))} />
                <MetricRow label="LTV" values={chosen.map((r) => (r.fundamentals?.ltv != null ? `${r.fundamentals.ltv.toFixed(0)}%` : "—"))} best={bestIdx(chosen.map((r) => r.fundamentals?.ltv ?? null), false)} />
                <MetricRow
                  label={type === "REIT" ? "Occupancy" : "Concession life"}
                  values={chosen.map((r) =>
                    type === "REIT"
                      ? r.fundamentals?.occupancy != null
                        ? `${r.fundamentals.occupancy.toFixed(1)}%`
                        : "—"
                      : r.fundamentals?.concessionLifeYears != null
                      ? `${r.fundamentals.concessionLifeYears.toFixed(1)} yrs`
                      : "—"
                  )}
                />
                <MetricRow label="Quarters of DPU data" values={chosen.map((r) => String(r.dpuQuarters))} />
              </tbody>
            </table>
          </div>

          {/* Scorecards */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-3 py-2.5 font-medium text-muted-foreground">Profile score (0–100)</th>
                  {chosen.map((r) => (
                    <th key={r.isin} className="px-3 py-2.5 font-medium">{r.symbol}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(["income", "value", "safety", "growth"] as const).map((k) => (
                  <tr key={k}>
                    <td className="px-3 py-2.5 capitalize text-muted-foreground">{k}</td>
                    {chosen.map((r) => {
                      const v = r.scores[k];
                      return (
                        <td key={r.isin} className="px-3 py-2.5">
                          {v == null ? (
                            "—"
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${v >= 67 ? "bg-green-500" : v >= 34 ? "bg-amber-500" : "bg-red-500"}`}
                                  style={{ width: `${v}%` }}
                                />
                              </div>
                              <span className="tnum text-xs">{Math.round(v)}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Green cells mark the best value in each row (within this selection). Scorecard weights
            are published on the <a href="/methodology/" className="underline">methodology page</a>.
            Scores are relative profiles, not buy/sell advice.
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Select at least 2 {type}s above to compare (up to 4).
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, values, best }: { label: string; values: string[]; best?: number | null }) {
  return (
    <tr>
      <td className="px-3 py-2.5 text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-3 py-2.5 tnum ${best === i ? "text-green-600 dark:text-green-400 font-semibold" : ""}`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

function bestIdx(values: (number | null)[], higherBetter: boolean): number | null {
  let best: number | null = null;
  let bestV: number | null = null;
  values.forEach((v, i) => {
    if (v == null) return;
    if (bestV == null || (higherBetter ? v > bestV : v < bestV)) {
      bestV = v;
      best = i;
    }
  });
  return best;
}
