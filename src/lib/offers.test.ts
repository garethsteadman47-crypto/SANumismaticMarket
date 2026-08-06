import { describe, expect, it } from "vitest";

import {
  computeEffectiveMinimumOfferCents,
  computeMinimumOfferCents,
  getAcceptedOfferPriceCents,
  MINIMUM_OFFER_RATIO,
} from "./offers";

describe("computeMinimumOfferCents", () => {
  it("is 70% of the listing price", () => {
    expect(MINIMUM_OFFER_RATIO).toBe(0.7);
    expect(computeMinimumOfferCents(100_00)).toBe(70_00);
  });

  it("rounds up so the minimum is never below the true 70% floor", () => {
    expect(computeMinimumOfferCents(100_01)).toBe(70_01);
  });

  it("handles a realistic Krugerrand price", () => {
    expect(computeMinimumOfferCents(6_850_000)).toBe(Math.ceil(6_850_000 * 0.7));
  });
});

describe("computeEffectiveMinimumOfferCents", () => {
  it("uses the higher of 70% and the seller minimum", () => {
    expect(computeEffectiveMinimumOfferCents(100_00, 80_00)).toBe(80_00);
    expect(computeEffectiveMinimumOfferCents(100_00, 60_00)).toBe(70_00);
    expect(computeEffectiveMinimumOfferCents(100_00, null)).toBe(70_00);
  });
});

describe("getAcceptedOfferPriceCents", () => {
  it("uses the counter amount when one exists", () => {
    expect(getAcceptedOfferPriceCents({ offerAmountCents: 100_00, counterAmountCents: 120_00 })).toBe(120_00);
  });

  it("falls back to the original offer amount otherwise", () => {
    expect(getAcceptedOfferPriceCents({ offerAmountCents: 100_00, counterAmountCents: null })).toBe(100_00);
  });
});
