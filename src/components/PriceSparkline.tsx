"use client";

import type { PricePoint } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/format";

/**
 * Lightweight SVG sparkline — no chart library, ~1KB.
 * Shows the EOD close line, plus a dashed NAV reference line when available.
 */
export function PriceSparkline({
  data,
  nav,
}: {
  data: PricePoint[];
  nav: number | null;
}) {
  if (data.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        Not enough price history yet.
      </div>
    );
  }

  const W = 800;
  const H = 160;
  const PAD = 8;

  const prices = data.map((d) => d.c);
  const min = Math.min(...prices, nav ?? Infinity);
  const max = Math.max(...prices, nav ?? -Infinity);
  const range = max - min || 1;

  const x = (i: number) => PAD + (i / (data.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - 2 * PAD);

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.c).toFixed(1)}`).join(" ");

  const first = data[0];
  const last = data[data.length - 1];
  const up = last.c >= first.c;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" role="img" aria-label="Price chart">
        {nav != null && (
          <>
            <line
              x1={PAD}
              x2={W - PAD}
              y1={y(nav)}
              y2={y(nav)}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-amber-500"
              strokeWidth="1"
            />
            <text x={W - PAD} y={y(nav) - 4} textAnchor="end" className="fill-amber-500" fontSize="10">
              NAV {formatINR(nav)}
            </text>
          </>
        )}
        <path d={path} fill="none" strokeWidth="1.5" className={up ? "stroke-green-600 dark:stroke-green-400" : "stroke-red-500 dark:stroke-red-400"} />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{formatDate(first.d)}</span>
        <span className="tnum">
          {formatINR(first.c)} → {formatINR(last.c)}
        </span>
        <span>{formatDate(last.d)}</span>
      </div>
    </div>
  );
}
