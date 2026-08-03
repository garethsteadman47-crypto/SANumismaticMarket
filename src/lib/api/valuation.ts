import { floatAround, hashString, intBetween, mulberry32, pick } from "@/lib/mock-random";

/**
 * Mock external data for the Product Detail Page's historical valuation
 * chart: quarterly auction realizations in the style of **Minted.co.za**'s
 * price index, plus a catalog reference value in the style of **Hern's
 * Handbook of South African Coins & Patterns**.
 *
 * Like `lib/api/verification.ts`, everything here is deterministic per
 * seed key (typically the listing's certificate ID, or its slug for
 * uncertified items) so refreshing a product page doesn't make its own
 * chart jump around.
 */

export interface ValuationPoint {
  /** ISO date (quarter start) for this data point. */
  date: string;
  realizedPriceCents: number;
}

export interface MintedValuationHistory {
  source: "Minted.co.za";
  points: ValuationPoint[];
  /** Trailing-12-month realized-price trend, as a percentage (+/-). */
  twelveMonthChangePercent: number;
}

const RARITY_RATINGS = ["Common", "Scarce", "Rare", "Very Rare", "Extremely Rare"] as const;

export interface HernsCatalogMetrics {
  source: "Hern's Handbook of South African Coins & Patterns";
  catalogNumber: string;
  rarityRating: (typeof RARITY_RATINGS)[number];
  referenceValueCents: number;
  editionYear: number;
}

const QUARTERS_OF_HISTORY = 12; // 3 years

function quarterStartIsoDate(quartersAgo: number): string {
  const now = new Date();
  const quarterIndex = Math.floor(now.getMonth() / 3) - quartersAgo;
  const date = new Date(now.getFullYear(), quarterIndex * 3, 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Generates a plausible ~3-year quarterly price history that trends
 * (with noise) toward the listing's current asking price — collectibles
 * in this price bracket tend to appreciate steadily rather than swing
 * wildly, so the walk is gently upward with per-quarter jitter.
 */
export function getMintedValuationHistory(seedKey: string, currentPriceCents: number): MintedValuationHistory {
  const rng = mulberry32(hashString(`minted:${seedKey}`));

  // Start ~35-55% below the current price 3 years ago, then random-walk
  // upward toward it.
  const startRatio = 0.45 + rng() * 0.2;
  let value = Math.max(1, Math.round(currentPriceCents * startRatio));

  const points: ValuationPoint[] = [];
  for (let i = QUARTERS_OF_HISTORY; i >= 0; i--) {
    const progress = 1 - i / QUARTERS_OF_HISTORY; // 0 -> 1 as we approach "now"
    const target = currentPriceCents * (startRatio + (1 - startRatio) * progress);
    // Pull gently toward the trend line, then add quarter-to-quarter noise.
    value = Math.round(value + (target - value) * 0.5);
    value = Math.max(1, Math.round(floatAround(rng, value, 0.06)));
    points.push({ date: quarterStartIsoDate(i), realizedPriceCents: value });
  }
  // Anchor the most recent point to the actual current price so the chart
  // visually ends where the listing's asking price is.
  points[points.length - 1] = { date: quarterStartIsoDate(0), realizedPriceCents: currentPriceCents };

  const oneYearAgoValue = points[Math.max(0, points.length - 5)].realizedPriceCents;
  const twelveMonthChangePercent = Math.round(((currentPriceCents - oneYearAgoValue) / oneYearAgoValue) * 1000) / 10;

  return { source: "Minted.co.za", points, twelveMonthChangePercent };
}

/** Deterministic mock Hern's Handbook catalog reference for a listing. */
export function getHernsCatalogMetrics(seedKey: string, currentPriceCents: number): HernsCatalogMetrics {
  const rng = mulberry32(hashString(`herns:${seedKey}`));
  const prefix = pick(rng, ["H4", "H5", "H6", "H7", "H8"] as const);
  const catalogNumber = `${prefix}.${intBetween(rng, 1, 40)}`;
  const rarityRating = pick(rng, RARITY_RATINGS);
  const referenceValueCents = Math.max(1, Math.round(floatAround(rng, currentPriceCents, 0.15)));
  const editionYear = intBetween(rng, 2022, 2026);

  return {
    source: "Hern's Handbook of South African Coins & Patterns",
    catalogNumber,
    rarityRating,
    referenceValueCents,
    editionYear,
  };
}
