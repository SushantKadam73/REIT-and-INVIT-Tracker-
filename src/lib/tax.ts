// Indian tax rules for REIT/InvIT distributions (resident individual, FY2026-27).
// This is educational, not tax advice. Always consult a CA.

export interface TaxBreakdown {
  grossIncome: number;
  interestTax: number;
  dividendTax: number;
  rocTax: number; // usually 0 — reduces cost basis
  otherTax: number;
  totalTax: number;
  postTaxIncome: number;
  effectiveRate: number; // percent
}

export interface TaxInput {
  interest: number;
  dividend: number;
  returnOfCapital: number;
  other: number;
  slabRate: number; // 0, 5, 10, 15, 20, 30
  dividendTaxable?: boolean; // some trusts have exempt dividends
}

/**
 * Compute tax on REIT/InvIT distributions for a resident individual.
 *
 * Rules (Finance Act 2023 onwards):
 * - Interest: taxable at slab rate. TDS 10% u/s 194LBA.
 * - Dividend: exempt if SPV opted concessional tax regime; otherwise slab rate.
 *   We default to taxable unless the trust data says otherwise.
 * - Return of capital: NOT current income. Reduces cost basis.
 *   However, cumulative RoC above original issue price is taxed as income.
 *   We ignore this edge case in v1 and just note it.
 * - Other income: taxed at slab rate.
 */
export function computeTax(input: TaxInput): TaxBreakdown {
  const { interest, dividend, returnOfCapital, other, slabRate, dividendTaxable = true } = input;

  const rate = slabRate / 100;

  const interestTax = interest * rate;
  const dividendTax = dividendTaxable ? dividend * rate : 0;
  const rocTax = 0; // return of capital reduces cost basis, not taxed as income
  const otherTax = other * rate;

  const grossIncome = interest + dividend + returnOfCapital + other;
  const totalTax = interestTax + dividendTax + rocTax + otherTax;
  const postTaxIncome = grossIncome - totalTax;
  const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

  return {
    grossIncome,
    interestTax,
    dividendTax,
    rocTax,
    otherTax,
    totalTax,
    postTaxIncome,
    effectiveRate,
  };
}

/**
 * Capital gains tax on listed REIT/InvIT units.
 * STCG (held < 12 months): 20% under section 111A (STT paid).
 * LTCG (held > 12 months): 12.5% under section 112A, with ₹1.25 lakh annual exemption.
 */
export function computeCapitalGains(
  buyPrice: number,
  sellPrice: number,
  units: number,
  holdingMonths: number,
  otherLtcgThisYear: number = 0
): { stcg: number; ltcg: number; tax: number; note: string } {
  const gain = (sellPrice - buyPrice) * units;

  if (gain <= 0) {
    return { stcg: 0, ltcg: 0, tax: 0, note: "No gain — no capital gains tax." };
  }

  if (holdingMonths < 12) {
    const tax = gain * 0.20;
    return { stcg: gain, ltcg: 0, tax, note: "STCG at 20% u/s 111A (STT paid)." };
  } else {
    const exemption = 125000; // ₹1.25 lakh LTCG exemption
    const taxable = Math.max(0, gain + otherLtcgThisYear - exemption) - otherLtcgThisYear;
    const tax = Math.max(0, taxable) * 0.125;
    return { stcg: 0, ltcg: gain, tax, note: "LTCG at 12.5% u/s 112A after ₹1.25 lakh exemption." };
  }
}

export const SLAB_RATES = [0, 5, 10, 15, 20, 30] as const;
export type SlabRate = (typeof SLAB_RATES)[number];
