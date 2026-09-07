import type { Distribution, TrustData, DerivedMetrics } from "./types";

/**
 * Compute TTM (trailing twelve months) metrics from the last 4 quarterly distributions.
 * Only uses distributions that have a known totalDPU.
 */
export function computeDerivedMetrics(data: TrustData): DerivedMetrics {
  const { distributions, price, fundamentals } = data;

  // Sort by quarter (Q1 -> Q4) and take the last 4
  const sorted = [...distributions].sort((a, b) => {
    const qOrder: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
    const [aQ, aFy] = a.quarter.split(" ");
    const [bQ, bFy] = b.quarter.split(" ");
    const fyA = parseInt(aFy?.replace("FY", "") || "0");
    const fyB = parseInt(bFy?.replace("FY", "") || "0");
    if (fyA !== fyB) return fyA - fyB;
    return (qOrder[aQ] || 0) - (qOrder[bQ] || 0);
  });

  const last4 = sorted.slice(-4);
  const known = last4.filter((d) => d.totalDPU != null);

  const ttmDpu = known.length > 0 ? known.reduce((s, d) => s + d.totalDPU, 0) : null;

  // Recurring DPU = total minus return of capital (return of capital is not income)
  const recurringDpu =
    known.length > 0
      ? known.reduce((s, d) => s + d.totalDPU - (d.returnOfCapital || 0), 0)
      : null;

  // Component totals for the last 4 quarters
  const ttmInterest = known.reduce((s, d) => s + (d.interest || 0), 0);
  const ttmDividend = known.reduce((s, d) => s + (d.dividend || 0), 0);
  const ttmRoc = known.reduce((s, d) => s + (d.returnOfCapital || 0), 0);
  const ttmOther = known.reduce((s, d) => s + (d.other || 0), 0);

  // How many of the last 4 quarters have a known component split?
  const splitCoverage =
    last4.length > 0
      ? last4.filter((d) => d.interest != null || d.dividend != null || d.returnOfCapital != null).length /
        last4.length
      : 0;

  const currentPrice = price?.price ?? null;
  const nav = fundamentals?.navPerUnit ?? null;

  const ttmYield = currentPrice && ttmDpu ? (ttmDpu / currentPrice) * 100 : null;
  const recurringYield = currentPrice && recurringDpu ? (recurringDpu / currentPrice) * 100 : null;

  const navPremiumPct =
    currentPrice && nav ? ((currentPrice - nav) / nav) * 100 : null;

  const rocSharePct = ttmDpu && ttmRoc ? (ttmRoc / ttmDpu) * 100 : null;

  return {
    ttmDpu,
    ttmYield,
    recurringDpu,
    recurringYield,
    navPremiumPct,
    rocSharePct,
    ttmInterest,
    ttmDividend,
    ttmRoc,
    ttmOther,
    splitCoverage,
  };
}

/**
 * Scorecard weights — published on the methodology page.
 * These are the inputs to the four profile scorecards.
 */
export const SCORECARD_WEIGHTS = {
  income: {
    recurringYield: 0.40,
    ndcfCoverage: 0.30, // placeholder — we don't have NDCF yet, so this is a stub
    dpuGrowth: 0.20,
    rocPenalty: 0.10,
  },
  value: {
    navDiscount: 0.60,
    ltv: 0.40,
  },
  safety: {
    ltv: 0.50,
    occupancyOrConcession: 0.30,
    sponsorQuality: 0.20,
  },
  growth: {
    dpuGrowth: 0.50,
    occupancyTrend: 0.30,
    sectorOutlook: 0.20,
  },
} as const;

/**
 * Compute a 0-100 score for each profile card.
 * Returns null when inputs are missing.
 */
export function computeScorecards(data: TrustData): {
  income: number | null;
  value: number | null;
  safety: number | null;
  growth: number | null;
} {
  const metrics = computeDerivedMetrics(data);
  const { fundamentals, distributions } = data;

  // Income score: higher recurring yield is better, penalize high RoC share
  let income: number | null = null;
  if (metrics.recurringYield != null) {
    const yieldScore = Math.min(metrics.recurringYield / 10, 1) * 100; // cap at 10%
    const rocPenalty = (metrics.rocSharePct || 0) * 2; // 50% RoC -> -100
    income = Math.max(0, yieldScore - rocPenalty);
  }

  // Value score: discount to NAV is better
  let value: number | null = null;
  if (metrics.navPremiumPct != null) {
    // -20% discount = 100, +20% premium = 0
    value = Math.max(0, Math.min(100, 50 - metrics.navPremiumPct * 2.5));
  }

  // Safety: lower LTV is better, higher occupancy is better
  let safety: number | null = null;
  if (fundamentals?.ltv != null) {
    const ltvScore = Math.max(0, 100 - fundamentals.ltv * 1.5); // 0% LTV -> 100, 66% -> 0
    const occScore = fundamentals.occupancy ?? 80; // default 80 if missing
    safety = ltvScore * 0.6 + occScore * 0.4;
  }

  // Growth: DPU growth YoY
  let growth: number | null = null;
  if (distributions.length >= 8) {
    const last4 = distributions.slice(-4);
    const prev4 = distributions.slice(-8, -4);
    const lastSum = last4.reduce((s, d) => s + d.totalDPU, 0);
    const prevSum = prev4.reduce((s, d) => s + d.totalDPU, 0);
    if (prevSum > 0) {
      const growthRate = ((lastSum - prevSum) / prevSum) * 100;
      growth = Math.max(0, Math.min(100, 50 + growthRate * 5)); // 0% growth -> 50, +10% -> 100
    }
  }

  return { income, value, safety, growth };
}
