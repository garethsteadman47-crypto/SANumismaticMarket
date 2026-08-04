import { PreciousMetal } from "@prisma/client";
import { floatAround, hashString, mulberry32 } from "@/lib/mock-random";

/**
 * Mock live precious-metal spot price feed (XAU/ZAR, XAG/ZAR).
 *
 * Nothing here makes a real network call — swap this for a real feed (e.g.
 * metals-api.com, or a bank's FX+bullion desk API) when one is available.
 * Prices are deterministically derived from today's date so the same day
 * always shows the same numbers (important for the melt-value badge and
 * for tests), while still drifting day to day like a real market.
 */

export type SpotMetal = "GOLD" | "SILVER";

export const TROY_OUNCE_GRAMS = 31.1034768;

/**
 * Approximate ZAR spot baselines for the mock feed:
 * Gold ≈ R1,400/g · Silver ≈ R31/g (converted via troy ounce).
 */
const BASE_PRICE_PER_OZ_CENTS: Record<SpotMetal, number> = {
  GOLD: Math.round(1_400 * 100 * TROY_OUNCE_GRAMS), // ~R1,400/g
  SILVER: Math.round(31 * 100 * TROY_OUNCE_GRAMS), // ~R31/g
};

const DAILY_DRIFT_RATIO: Record<SpotMetal, number> = {
  GOLD: 0.015,
  SILVER: 0.03,
};

export interface SpotHistoryPoint {
  label: string;
  timestamp: string;
  pricePerOzCents: number;
}

export interface SpotPriceQuote {
  metal: SpotMetal;
  pricePerOzCents: number;
  pricePerGramCents: number;
  changePercent24h: number;
  changePercent7d: number;
  /** Daily closes for the trailing 7 days, oldest first, ending at today's quote. */
  history7d: SpotHistoryPoint[];
  /** Hourly closes for the trailing 24 hours, oldest first, ending at today's quote. */
  history24h: SpotHistoryPoint[];
  asOf: string;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Deterministic per-day close price for a metal, used to build history + "today"'s quote. */
function dailyClosePriceCents(metal: SpotMetal, date: Date): number {
  const rng = mulberry32(hashString(`spot:${metal}:${dateKey(date)}`));
  return Math.round(floatAround(rng, BASE_PRICE_PER_OZ_CENTS[metal], DAILY_DRIFT_RATIO[metal]));
}

function hourlyPriceCents(metal: SpotMetal, date: Date): number {
  const dayClose = dailyClosePriceCents(metal, date);
  const rng = mulberry32(hashString(`spot-intraday:${metal}:${date.toISOString().slice(0, 13)}`));
  return Math.round(floatAround(rng, dayClose, DAILY_DRIFT_RATIO[metal] / 6));
}

/** Live (mock) spot quote for a metal, deterministic for a given `now` (defaults to the real current time). */
export function getSpotPriceQuote(metal: SpotMetal, now: Date = new Date()): SpotPriceQuote {
  const todayCents = dailyClosePriceCents(metal, now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayCents = dailyClosePriceCents(metal, yesterday);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoCents = dailyClosePriceCents(metal, weekAgo);

  const history7d: SpotHistoryPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    history7d.push({
      label: day.toLocaleDateString("en-ZA", { weekday: "short" }),
      timestamp: day.toISOString(),
      pricePerOzCents: dailyClosePriceCents(metal, day),
    });
  }

  const history24h: SpotHistoryPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    history24h.push({
      label: hour.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
      timestamp: hour.toISOString(),
      pricePerOzCents: hourlyPriceCents(metal, hour),
    });
  }

  return {
    metal,
    pricePerOzCents: todayCents,
    pricePerGramCents: Math.round(todayCents / TROY_OUNCE_GRAMS),
    changePercent24h: Math.round(((todayCents - yesterdayCents) / yesterdayCents) * 10000) / 100,
    changePercent7d: Math.round(((todayCents - weekAgoCents) / weekAgoCents) * 10000) / 100,
    history7d,
    history24h,
    asOf: now.toISOString(),
  };
}

/** Whether a listing's metal has a live spot feed worth showing (Gold/Silver only, for now). */
export function isSpotTrackedMetal(metal: PreciousMetal): metal is "GOLD" | "SILVER" {
  return metal === PreciousMetal.GOLD || metal === PreciousMetal.SILVER;
}

/**
 * Melt value: the raw commodity value of the metal content, ignoring any
 * numismatic/collector premium — `spot price per gram * fine weight`.
 * `weightGrams` is the item's total weight; `purityPercent` (0-100) narrows
 * that down to the actual fine metal content (e.g. a Krugerrand is 91.7%
 * pure gold by weight).
 */
export function calculateMeltValueCents({
  pricePerGramCents,
  weightGrams,
  purityPercent,
}: {
  pricePerGramCents: number;
  weightGrams: number;
  purityPercent: number;
}): number {
  const fineWeightGrams = weightGrams * (purityPercent / 100);
  return Math.round(fineWeightGrams * pricePerGramCents);
}

/** How much the asking price sits above (positive) or below (negative) melt value, as a percentage. */
export function calculatePremiumPercent(listingPriceCents: number, meltValueCents: number): number {
  if (meltValueCents <= 0) return 0;
  return Math.round(((listingPriceCents - meltValueCents) / meltValueCents) * 10000) / 100;
}
