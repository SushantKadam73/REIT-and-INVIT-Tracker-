// Static data loading.
// In the static export (output: "export") there is no server at runtime,
// so we import the JSON directly — it gets bundled at build time.
// The nightly GitHub Action updates these JSON files and triggers a rebuild.

import universeJson from "../../data/trusts.json";
import pricesJson from "../../data/prices.json";
import distributionsJson from "../../data/distributions.json";
import fundamentalsJson from "../../data/fundamentals.json";
import type {
  Universe,
  PriceInfo,
  Distribution,
  Fundamentals,
  Trust,
  TrustData,
  PricePoint,
} from "./types";

export const universe = universeJson as unknown as Universe;
export const trusts: Trust[] = universe.universe;

const prices = pricesJson as unknown as Record<string, PriceInfo>;
const distributions = distributionsJson as unknown as Record<string, Distribution[]>;
const fundamentals = fundamentalsJson as unknown as Record<string, Fundamentals>;

// History files are keyed by ISIN. We load them with a static import map
// so the bundler includes them at build time.
// (Adding a new trust? Add a line here AND to data/trusts.json.)
const historyMap: Record<string, () => Promise<PricePoint[]>> = {
  INE041025011: () => import("../../data/history/INE041025011.json").then((m) => m.default as PricePoint[]),
  INE0CCU25019: () => import("../../data/history/INE0CCU25019.json").then((m) => m.default as PricePoint[]),
  INE0FDU25010: () => import("../../data/history/INE0FDU25010.json").then((m) => m.default as PricePoint[]),
  INE0NDH25011: () => import("../../data/history/INE0NDH25011.json").then((m) => m.default as PricePoint[]),
  INE1JAR25012: () => import("../../data/history/INE1JAR25012.json").then((m) => m.default as PricePoint[]),
  INE2OVN25015: () => import("../../data/history/INE2OVN25015.json").then((m) => m.default as PricePoint[]),
  INE183W23014: () => import("../../data/history/INE183W23014.json").then((m) => m.default as PricePoint[]),
  INE219X23014: () => import("../../data/history/INE219X23014.json").then((m) => m.default as PricePoint[]),
  INE0GGX23010: () => import("../../data/history/INE0GGX23010.json").then((m) => m.default as PricePoint[]),
  INE0NHL23019: () => import("../../data/history/INE0NHL23019.json").then((m) => m.default as PricePoint[]),
  INE0Z8Z23013: () => import("../../data/history/INE0Z8Z23013.json").then((m) => m.default as PricePoint[]),
  INE1UA823019: () => import("../../data/history/INE1UA823019.json").then((m) => m.default as PricePoint[]),
  INE2PB023011: () => import("../../data/history/INE2PB023011.json").then((m) => m.default as PricePoint[]),
  INE2Q7823014: () => import("../../data/history/INE2Q7823014.json").then((m) => m.default as PricePoint[]),
  INE0NR623014: () => import("../../data/history/INE0NR623014.json").then((m) => m.default as PricePoint[]),
};

export function getTrust(symbolOrIsin: string): Trust | undefined {
  return trusts.find(
    (t) => t.nseSymbol.toUpperCase() === symbolOrIsin.toUpperCase() || t.isin === symbolOrIsin
  );
}

/** Synchronous access to everything except price history. */
export function getTrustData(symbolOrIsin: string): TrustData | undefined {
  const trust = getTrust(symbolOrIsin);
  if (!trust) return undefined;
  return {
    trust,
    price: prices[trust.isin] || null,
    fundamentals: fundamentals[trust.isin] || null,
    distributions: distributions[trust.isin] || [],
    history: [], // filled by getTrustDataAsync on detail pages
  };
}

/** Async version that includes price history (used by the trust detail page). */
export async function getTrustDataAsync(symbolOrIsin: string): Promise<TrustData | undefined> {
  const base = getTrustData(symbolOrIsin);
  if (!base) return undefined;
  const loader = historyMap[base.trust.isin];
  const history = loader ? await loader() : [];
  return { ...base, history };
}

export function getAllTrustData(): TrustData[] {
  return trusts.map((t) => getTrustData(t.isin)!).filter(Boolean);
}

export function getTrustsByType(type: "REIT" | "InvIT"): TrustData[] {
  return getAllTrustData().filter((d) => d.trust.type === type);
}
