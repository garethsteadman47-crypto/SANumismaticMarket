import { describe, expect, it } from "vitest";

import {
  calculateMeltValueCents,
  calculatePremiumPercent,
  getSpotPriceQuote,
  isSpotTrackedMetal,
  TROY_OUNCE_GRAMS,
} from "./spot-prices";

describe("spot price quotes", () => {
  it("is deterministic for the same day", () => {
    const now = new Date("2026-03-15T12:00:00.000Z");
    const a = getSpotPriceQuote("GOLD", now);
    const b = getSpotPriceQuote("GOLD", now);
    expect(a.pricePerOzCents).toBe(b.pricePerOzCents);
    expect(a.pricePerGramCents).toBe(b.pricePerGramCents);
  });

  it("derives price per gram from price per oz using troy ounce conversion", () => {
    const quote = getSpotPriceQuote("SILVER", new Date("2026-01-01T00:00:00.000Z"));
    expect(quote.pricePerGramCents).toBe(Math.round(quote.pricePerOzCents / TROY_OUNCE_GRAMS));
  });

  it("returns 7 daily points and 24 hourly points", () => {
    const quote = getSpotPriceQuote("GOLD", new Date("2026-06-01T00:00:00.000Z"));
    expect(quote.history7d).toHaveLength(7);
    expect(quote.history24h).toHaveLength(24);
    expect(quote.history7d[quote.history7d.length - 1].pricePerOzCents).toBe(quote.pricePerOzCents);
  });

  it("targets approximately R1,400/g gold and R31/g silver", () => {
    const now = new Date("2026-03-15T12:00:00.000Z");
    const gold = getSpotPriceQuote("GOLD", now);
    const silver = getSpotPriceQuote("SILVER", now);
    const goldPerGramRands = gold.pricePerGramCents / 100;
    const silverPerGramRands = silver.pricePerGramCents / 100;
    expect(goldPerGramRands).toBeGreaterThan(1_300);
    expect(goldPerGramRands).toBeLessThan(1_500);
    expect(silverPerGramRands).toBeGreaterThan(28);
    expect(silverPerGramRands).toBeLessThan(34);
  });
});

describe("isSpotTrackedMetal", () => {
  it("only tracks gold and silver", () => {
    expect(isSpotTrackedMetal("GOLD")).toBe(true);
    expect(isSpotTrackedMetal("SILVER")).toBe(true);
    expect(isSpotTrackedMetal("PLATINUM")).toBe(false);
    expect(isSpotTrackedMetal("NOT_APPLICABLE")).toBe(false);
  });
});

describe("calculateMeltValueCents", () => {
  it("multiplies fine weight (weight * purity) by price per gram", () => {
    // 1oz Krugerrand: 33.93g total, 91.7% pure gold => ~31.1g fine gold (~1 troy oz).
    const meltValue = calculateMeltValueCents({
      pricePerGramCents: 150_000, // R1,500.00/g
      weightGrams: 33.93,
      purityPercent: 91.7,
    });
    // fine weight = 33.93 * 0.917 = 31.113... grams
    const expectedFineWeight = 33.93 * 0.917;
    expect(meltValue).toBe(Math.round(expectedFineWeight * 150_000));
  });

  it("returns 0 for zero weight", () => {
    expect(calculateMeltValueCents({ pricePerGramCents: 150_000, weightGrams: 0, purityPercent: 91.7 })).toBe(0);
  });
});

describe("calculatePremiumPercent", () => {
  it("computes a positive premium when asking price exceeds melt value", () => {
    expect(calculatePremiumPercent(105_00, 100_00)).toBe(5);
  });

  it("computes a negative premium when asking price is below melt value", () => {
    expect(calculatePremiumPercent(90_00, 100_00)).toBe(-10);
  });

  it("returns 0 when melt value is 0 (avoids divide-by-zero)", () => {
    expect(calculatePremiumPercent(100_00, 0)).toBe(0);
  });
});
