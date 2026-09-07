"use client";

import type { TrustType } from "@/lib/types";

interface Scores {
  income: number | null;
  value: number | null;
  safety: number | null;
  growth: number | null;
}

const CARDS: { key: keyof Scores; label: string; desc: string }[] = [
  { key: "income", label: "Income", desc: "Recurring yield quality, penalised for return-of-capital share" },
  { key: "value", label: "Value", desc: "Price vs latest NAV — discount scores higher" },
  { key: "safety", label: "Safety", desc: "Leverage (LTV) and occupancy / asset stability" },
  { key: "growth", label: "Growth", desc: "Year-over-year DPU growth" },
];

function barColor(v: number): string {
  if (v >= 67) return "bg-green-500";
  if (v >= 34) return "bg-amber-500";
  return "bg-red-500";
}

export function Scorecards({ scores, type }: { scores: Scores; type: TrustType }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map((c) => {
        const v = scores[c.key];
        return (
          <div key={c.key} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-sm font-medium">{c.label}</div>
              <div className="text-lg font-bold tnum">
                {v == null ? "—" : Math.round(v)}
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              {v != null && (
                <div
                  className={`h-full rounded-full ${barColor(v)}`}
                  style={{ width: `${Math.round(v)}%` }}
                />
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">{c.desc}</div>
          </div>
        );
      })}
    </div>
  );
}
