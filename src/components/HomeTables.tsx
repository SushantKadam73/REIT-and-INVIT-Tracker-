"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TrustData, DerivedMetrics } from "@/lib/types";
import { formatINR, formatPct, formatPctPlain, formatDate, daysSince } from "@/lib/format";

interface Row {
  data: TrustData;
  metrics: DerivedMetrics;
}

type SortKey =
  | "name"
  | "price"
  | "change1d"
  | "mcap"
  | "ttmYield"
  | "recurringYield"
  | "navPrem"
  | "ltv"
  | "occ";

const COLUMNS: { key: SortKey; label: string; hint?: string }[] = [
  { key: "name", label: "Trust" },
  { key: "price", label: "Price (EOD)" },
  { key: "change1d", label: "1D %" },
  { key: "mcap", label: "Mkt Cap" },
  { key: "ttmYield", label: "TTM Yield", hint: "Last 4 quarters DPU ÷ price" },
  { key: "recurringYield", label: "Recurring Yield", hint: "TTM minus return of capital" },
  { key: "navPrem", label: "vs NAV", hint: "Premium (+) or discount (−) to latest NAV" },
  { key: "ltv", label: "LTV", hint: "Leverage — lower is safer" },
  { key: "occ", label: "Occupancy / Concession", hint: "Occupancy for REITs, concession life for InvITs" },
];

function getValue(row: Row, key: SortKey): number | string | null {
  const { data, metrics } = row;
  switch (key) {
    case "name":
      return data.trust.name;
    case "price":
      return data.price?.price ?? null;
    case "change1d":
      return data.price?.change1d ?? null;
    case "mcap":
      return data.fundamentals?.marketCapCr ?? null;
    case "ttmYield":
      return metrics.ttmYield;
    case "recurringYield":
      return metrics.recurringYield;
    case "navPrem":
      return metrics.navPremiumPct;
    case "ltv":
      return data.fundamentals?.ltv ?? null;
    case "occ":
      return data.trust.type === "REIT"
        ? data.fundamentals?.occupancy ?? null
        : data.fundamentals?.concessionLifeYears ?? null;
  }
}

function TrustTable({ rows, type }: { rows: Row[]; type: "REIT" | "InvIT" }) {
  const [sortKey, setSortKey] = useState<SortKey>("ttmYield");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") return sortDesc ? vb.toString().localeCompare(va) : va.localeCompare(vb.toString());
      return sortDesc ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
    return copy;
  }, [rows, sortKey, sortDesc]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(key !== "name");
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            {COLUMNS.filter((c) => type === "REIT" || c.key !== "occ" || true).map((col) => (
              <th
                key={col.key}
                onClick={() => toggle(col.key)}
                className="px-3 py-2.5 font-medium cursor-pointer select-none whitespace-nowrap hover:text-foreground text-muted-foreground"
                title={col.hint}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 text-foreground">{sortDesc ? "↓" : "↑"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ data, metrics }) => {
            const t = data.trust;
            const p = data.price;
            const f = data.fundamentals;
            const navStale = daysSince(f?.navDate);
            return (
              <tr key={t.isin} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5">
                  <Link href={`/trust/${t.nseSymbol}/`} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {t.nseSymbol} · {t.sector}
                  </div>
                </td>
                <td className="px-3 py-2.5 tnum whitespace-nowrap">
                  {formatINR(p?.price)}
                  {p?.asOf && (
                    <div className="text-[10px] text-muted-foreground">{formatDate(p.asOf)}</div>
                  )}
                </td>
                <td
                  className={`px-3 py-2.5 tnum ${
                    (p?.change1d ?? 0) > 0
                      ? "text-green-600 dark:text-green-400"
                      : (p?.change1d ?? 0) < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                  }`}
                >
                  {formatPct(p?.change1d)}
                </td>
                <td className="px-3 py-2.5 tnum whitespace-nowrap">
                  {f?.marketCapCr ? `₹${f.marketCapCr.toLocaleString("en-IN")} cr` : "—"}
                </td>
                <td className="px-3 py-2.5 tnum font-medium">
                  {formatPctPlain(metrics.ttmYield)}
                </td>
                <td className="px-3 py-2.5 tnum">
                  {formatPctPlain(metrics.recurringYield)}
                  {metrics.splitCoverage > 0 && metrics.splitCoverage < 1 && (
                    <span title="Some quarters lack component breakdown" className="text-amber-500 ml-1">*</span>
                  )}
                </td>
                <td className="px-3 py-2.5 tnum whitespace-nowrap">
                  {metrics.navPremiumPct == null ? (
                    "—"
                  ) : (
                    <span
                      className={
                        metrics.navPremiumPct < 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      }
                    >
                      {formatPct(metrics.navPremiumPct)}
                    </span>
                  )}
                  {f?.navDate && (
                    <div className="text-[10px] text-muted-foreground">
                      NAV {formatDate(f.navDate)}
                      {navStale != null && navStale > 120 && (
                        <span className="ml-1 text-amber-500" title="NAV is over 120 days old">•</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 tnum">
                  {f?.ltv != null ? `${f.ltv.toFixed(0)}%` : "—"}
                </td>
                <td className="px-3 py-2.5 tnum">
                  {t.type === "REIT"
                    ? f?.occupancy != null
                      ? `${f.occupancy.toFixed(1)}%`
                      : "—"
                    : f?.concessionLifeYears != null
                    ? `${f.concessionLifeYears.toFixed(1)} yrs`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function HomeTables({ reits, invits }: { reits: Row[]; invits: Row[] }) {
  const [tab, setTab] = useState<"REIT" | "InvIT">("REIT");

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["REIT", "InvIT"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}s ({t === "REIT" ? reits.length : invits.length})
          </button>
        ))}
      </div>
      {tab === "REIT" ? (
        <TrustTable rows={reits} type="REIT" />
      ) : (
        <TrustTable rows={invits} type="InvIT" />
      )}
      <p className="text-xs text-muted-foreground mt-3">
        * Component breakdown incomplete for some quarters — shown when the trust hasn&apos;t
        published the split. &quot;—&quot; means data not available. Yields are backward-looking
        (TTM) and not a forecast.
      </p>
    </div>
  );
}
