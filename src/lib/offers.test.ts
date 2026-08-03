import { describe, expect, it } from "vitest";

import { computeMinimumOfferCents, getAcceptedOfferPriceCents, MINIMUM_OFFER_RATIO } from "./offers";

describe("computeMinimumOfferCents", () => {
  it("is 70% of the listing price", () => {
    expect(MINIMUM_OFFER_RATIO).toBe(0.7);
    expect(computeMinimumOfferCents(100_00)).toBe(70_00);
  });

  it("rounds up so the minimum is never below the true 70% floor", () => {
    // 100_01 * 0.7 = 70_00.7 -> must round UP to 70_01, not down to 70_00.
    expect(computeMinimumOfferCents(100_01)).toBe(70_01);
  });

  it("handles a realistic Krugerrand price", () => {
    expect(computeMinimumOfferCents(6_850_000)).toBe(Math.ceil(6_850_000 * 0.7));
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
