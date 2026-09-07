// Core types for the REIT/InvIT tracker.
// All money values are in INR (₹). Dates are ISO strings (YYYY-MM-DD) in IST.

export type TrustType = "REIT" | "InvIT";

export interface Trust {
  isin: string;
  nseSymbol: string;
  bseCode: string;
  name: string;
  type: TrustType;
  sector: string;
  sponsor: string;
  listedDate: string; // ISO
  lotSize: number;
}

export interface Universe {
  version: string;
  asOf: string;
  source: string;
  universe: Trust[];
}

export interface PricePoint {
  d: string; // ISO date
  c: number; // close price
}

export interface PriceInfo {
  symbol: string;
  name: string;
  type: TrustType;
  price: number | null;
  prevClose: number | null;
  change1d: number | null; // percent, e.g. 0.06 means +0.06%
  asOf: string | null;
  source: string;
}

export interface Distribution {
  quarter: string; // e.g. "Q4 FY2026"
  fy: string; // e.g. "FY2026"
  totalDPU: number;
  interest: number | null;
  dividend: number | null;
  returnOfCapital: number | null;
  other: number | null;
  note?: string;
  recordDate: string | null;
  exDate: string | null;
  paymentDate: string | null;
  sourceUrl: string | null;
}

export interface Fundamentals {
  navPerUnit: number | null;
  navDate: string | null;
  navCr: number | null;
  ltv: number | null; // percent
  occupancy: number | null; // percent (REITs)
  concessionLifeYears: number | null; // (InvITs)
  gavCr: number | null;
  marketCapCr: number | null;
  sector: string;
  sponsor: string;
  listedDate: string;
  sourceUrl: string | null;
  notes?: string;
}

export interface TrustData {
  trust: Trust;
  price: PriceInfo | null;
  fundamentals: Fundamentals | null;
  distributions: Distribution[];
  history: PricePoint[];
}

// Derived metrics computed from raw data
export interface DerivedMetrics {
  ttmDpu: number | null; // sum of last 4 quarterly DPUs
  ttmYield: number | null; // ttmDpu / price * 100
  recurringDpu: number | null; // ttm minus return-of-capital
  recurringYield: number | null;
  navPremiumPct: number | null; // (price - nav) / nav * 100
  rocSharePct: number | null; // return-of-capital share of TTM DPU
  ttmInterest: number | null;
  ttmDividend: number | null;
  ttmRoc: number | null;
  ttmOther: number | null;
  splitCoverage: number; // 0-1: fraction of last 4 quarters with known component split
}
