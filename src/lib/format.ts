// Indian number formatting helpers.
// Everything the user sees goes through these — no raw toLocaleString("en-US").

/**
 * Format a rupee amount in Indian style with lakh/crore grouping.
 * 1234.5 -> "₹1,234.50"
 * 123456 -> "₹1.23 lakh"
 * 415220000000 -> "₹41,522 cr"
 */
export function formatINR(
  value: number | null | undefined,
  opts: { decimals?: number; compact?: boolean } = {}
): string {
  if (value == null || isNaN(value)) return "—";
  const { decimals = 2, compact = false } = opts;
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";

  if (compact) {
    if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 0 })} cr`;
    if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} lakh`;
  }
  return `${sign}₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format a number with Indian digit grouping (lakhs/crores), no currency symbol. */
export function formatNum(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return "—";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a percentage value (input is already in percent, e.g. 6.5 for 6.5%). */
export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Format a plain percentage without forcing a + sign. */
export function formatPctPlain(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/** Format an ISO date as "07 Sep 2026" (IST). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso.length === 10 ? iso + "T00:00:00+05:30" : iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

/** How many days old an ISO date is (for stale-data badges). */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const then = new Date(iso.length === 10 ? iso + "T00:00:00+05:30" : iso).getTime();
    return Math.floor((Date.now() - then) / 86400000);
  } catch {
    return null;
  }
}

/** Parse a user-entered amount that may contain lakh/crore words or commas. */
export function parseINRInput(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[₹,\s]/g, "").toLowerCase();
  const lakhMatch = cleaned.match(/^([\d.]+)l(akh)?s?$/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 1e5;
  const crMatch = cleaned.match(/^([\d.]+)cr(ore)?s?$/);
  if (crMatch) return parseFloat(crMatch[1]) * 1e7;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}
