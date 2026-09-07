"use client";

import type { Distribution } from "@/lib/types";
import { formatINR } from "@/lib/format";

const COLORS = {
  interest: "fill-blue-500",
  dividend: "fill-green-500",
  roc: "fill-amber-500",
  other: "fill-slate-400",
  unknown: "fill-slate-300 dark:fill-slate-600",
};

/**
 * Stacked-by-component DPU bar chart in pure SVG.
 * Quarters without a published split render as a single grey "unclassified" bar —
 * we never guess the breakdown.
 */
export function DistributionChart({ distributions }: { distributions: Distribution[] }) {
  const sorted = [...distributions].slice(-8); // last 8 quarters
  if (sorted.length === 0) return null;

  const W = 800;
  const H = 200;
  const PADB = 24;
  const PADT = 12;
  const barW = Math.min(60, (W / sorted.length) * 0.6);
  const maxDpu = Math.max(...sorted.map((d) => d.totalDPU)) || 1;

  const y = (v: number) => H - PADB - (v / maxDpu) * (H - PADB - PADT);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" role="img" aria-label="DPU by component">
        {sorted.map((d, i) => {
          const cx = (i + 0.5) * (W / sorted.length);
          const x = cx - barW / 2;
          const known =
            d.interest != null || d.dividend != null || d.returnOfCapital != null || d.other != null;

          if (!known) {
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y(d.totalDPU)}
                  width={barW}
                  height={H - PADB - y(d.totalDPU)}
                  className={COLORS.unknown}
                  rx={2}
                >
                  <title>{`${d.quarter}: ${formatINR(d.totalDPU)} (component split not published)`}</title>
                </rect>
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" className="fill-muted-foreground">
                  {d.quarter.replace(" FY", " FY")}
                </text>
              </g>
            );
          }

          const parts = [
            { v: d.interest || 0, c: COLORS.interest, label: "Interest" },
            { v: d.dividend || 0, c: COLORS.dividend, label: "Dividend" },
            { v: d.returnOfCapital || 0, c: COLORS.roc, label: "Return of capital" },
            { v: d.other || 0, c: COLORS.other, label: "Other" },
          ].filter((p) => p.v > 0);

          let acc = 0;
          return (
            <g key={i}>
              {parts.map((p, j) => {
                const y0 = y(acc + p.v);
                const h = y(acc) - y(acc + p.v);
                acc += p.v;
                return (
                  <rect key={j} x={x} y={y0} width={barW} height={h} className={p.c}>
                    <title>{`${d.quarter} ${p.label}: ${formatINR(p.v)}`}</title>
                  </rect>
                );
              })}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" className="fill-muted-foreground">
                {d.quarter.replace(" FY", " FY")}
              </text>
              <text x={cx} y={y(d.totalDPU) - 4} textAnchor="middle" fontSize="9" className="fill-foreground tnum">
                {d.totalDPU.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
        <Legend className={COLORS.interest} label="Interest (slab tax)" />
        <Legend className={COLORS.dividend} label="Dividend (maybe exempt)" />
        <Legend className={COLORS.roc} label="Return of capital (not income)" />
        <Legend className={COLORS.other} label="Other" />
        <Legend className={COLORS.unknown} label="Split not published" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="10" height="10"><rect width="10" height="10" rx="2" className={className} /></svg>
      {label}
    </span>
  );
}
