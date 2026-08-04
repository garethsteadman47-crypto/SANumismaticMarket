import { describe, expect, it } from "vitest";
import { SubscriptionTier } from "@prisma/client";
import {
  InvalidPriceError,
  calculateCommission,
  calculateOrderFeeBreakdown,
  calculateVat,
  getPriceTier,
  getVerificationFeeCents,
} from "./fees";

describe("getPriceTier", () => {
  it("resolves tier 1 for prices from R1 up to and including R10,000", () => {
    expect(getPriceTier(100)).toBe(1); // R1
    expect(getPriceTier(1_000_000)).toBe(1); // R10,000 exactly
  });

  it("resolves tier 2 just above R10,000 up to R50,000", () => {
    expect(getPriceTier(1_000_001)).toBe(2);
    expect(getPriceTier(5_000_000)).toBe(2); // R50,000 exactly
  });

  it("resolves tier 3 just above R50,000 up to R150,000", () => {
    expect(getPriceTier(5_000_001)).toBe(3);
    expect(getPriceTier(15_000_000)).toBe(3); // R150,000 exactly
  });

  it("resolves tier 4 (uncapped) for anything above R150,000", () => {
    expect(getPriceTier(15_000_001)).toBe(4);
    expect(getPriceTier(1_000_000_000)).toBe(4); // R10,000,000
  });

  it("rejects non-positive or non-integer prices", () => {
    expect(() => getPriceTier(0)).toThrow(InvalidPriceError);
    expect(() => getPriceTier(-500)).toThrow(InvalidPriceError);
    expect(() => getPriceTier(99.5)).toThrow(InvalidPriceError);
  });
});

describe("getVerificationFeeCents", () => {
  it("charges R15 for Standard and Silver; waives for Gold and Dealer", () => {
    expect(getVerificationFeeCents(SubscriptionTier.STANDARD)).toBe(1_500);
    expect(getVerificationFeeCents(SubscriptionTier.SILVER)).toBe(1_500);
    expect(getVerificationFeeCents(SubscriptionTier.GOLD)).toBe(0);
    expect(getVerificationFeeCents(SubscriptionTier.DEALER)).toBe(0);
  });
});

describe("calculateCommission", () => {
  const cases: Array<[number, SubscriptionTier, number, number]> = [
    // priceCents, tier, expected rateBps, expected commissionAmountCents
    [500_000, SubscriptionTier.STANDARD, 750, 37_500], // R5,000 @ 7.5%
    [500_000, SubscriptionTier.SILVER, 600, 30_000], // R5,000 @ 6%
    [500_000, SubscriptionTier.GOLD, 450, 22_500], // R5,000 @ 4.5%
    [2_000_000, SubscriptionTier.STANDARD, 500, 100_000], // R20,000 @ 5%
    [2_000_000, SubscriptionTier.SILVER, 400, 80_000], // R20,000 @ 4%
    [2_000_000, SubscriptionTier.GOLD, 300, 60_000], // R20,000 @ 3%
    [10_000_000, SubscriptionTier.STANDARD, 250, 250_000], // R100,000 @ 2.5%
    [10_000_000, SubscriptionTier.SILVER, 200, 200_000], // R100,000 @ 2%
    [10_000_000, SubscriptionTier.GOLD, 150, 150_000], // R100,000 @ 1.5%
    [50_000_000, SubscriptionTier.STANDARD, 200, 1_000_000], // R500,000 @ 2%
    [50_000_000, SubscriptionTier.SILVER, 150, 750_000], // R500,000 @ 1.5%
    [50_000_000, SubscriptionTier.GOLD, 100, 500_000], // R500,000 @ 1% (uncapped floor)
  ];

  it.each(cases)(
    "priceCents=%i tier=%s -> rateBps=%i commissionAmountCents=%i",
    (priceCents, tier, expectedRateBps, expectedCommission) => {
      const result = calculateCommission(priceCents, tier);
      expect(result.rateBps).toBe(expectedRateBps);
      expect(result.commissionAmountCents).toBe(expectedCommission);
    }
  );

  it("never charges a lower rate than the Gold uncapped floor, however large the sale", () => {
    const result = calculateCommission(50_000_000_000, SubscriptionTier.GOLD); // R500,000,000
    expect(result.rateBps).toBe(100);
  });
});

describe("calculateVat", () => {
  it("applies the 15% SARS output VAT rate", () => {
    expect(calculateVat(10_000)).toBe(1_500);
    expect(calculateVat(0)).toBe(0);
  });

  it("rejects negative amounts", () => {
    expect(() => calculateVat(-1)).toThrow();
  });
});

describe("calculateOrderFeeBreakdown", () => {
  it("computes the full breakdown for a Gold Dealer's R20,000 graded-coin sale", () => {
    // R20,000 sale, Tier 2, Gold -> 3% commission = R600 (60,000c)
    // + R15 cert fee (1,500c) + R0 ad boost
    // VAT = 15% of (60,000 + 1,500 + 0) = 9,225c
    // total platform fees = 60,000 + 1,500 + 0 + 9,225 = 70,725c
    // seller payout = 2,000,000 - 70,725 = 1,929,275c
    const breakdown = calculateOrderFeeBreakdown({
      itemPriceCents: 2_000_000,
      subscriptionTier: SubscriptionTier.GOLD,
      verificationFeeCents: 1_500,
    });

    expect(breakdown.priceTier).toBe(2);
    expect(breakdown.commissionRateBps).toBe(300);
    expect(breakdown.commissionAmountCents).toBe(60_000);
    expect(breakdown.verificationFeeCents).toBe(1_500);
    expect(breakdown.adBoostFeeCents).toBe(0);
    expect(breakdown.platformVatCents).toBe(9_225);
    expect(breakdown.totalPlatformFeesCents).toBe(70_725);
    expect(breakdown.sellerPayoutCents).toBe(1_929_275);
  });

  it("factors in ad boost spend for a Standard seller", () => {
    // R8,000 sale, Tier 1, Standard -> 7.5% commission = R600 (60,000c)
    // + R15 cert fee (1,500c) + R200 ad boost (20,000c)
    // VAT = 15% of (60,000 + 1,500 + 20,000) = 12,225c
    // total fees = 60,000 + 1,500 + 20,000 + 12,225 = 93,725c
    // payout = 800,000 - 93,725 = 706,275c
    const breakdown = calculateOrderFeeBreakdown({
      itemPriceCents: 800_000,
      subscriptionTier: SubscriptionTier.STANDARD,
      verificationFeeCents: 1_500,
      adBoostFeeCents: 20_000,
    });

    expect(breakdown.commissionAmountCents).toBe(60_000);
    expect(breakdown.platformVatCents).toBe(12_225);
    expect(breakdown.totalPlatformFeesCents).toBe(93_725);
    expect(breakdown.sellerPayoutCents).toBe(706_275);
  });

  it("defaults verification and ad-boost fees to zero for a raw, unboosted listing", () => {
    const breakdown = calculateOrderFeeBreakdown({
      itemPriceCents: 100_000,
      subscriptionTier: SubscriptionTier.SILVER,
    });

    expect(breakdown.verificationFeeCents).toBe(0);
    expect(breakdown.adBoostFeeCents).toBe(0);
    expect(breakdown.sellerPayoutCents).toBeLessThan(breakdown.itemPriceCents);
  });

  it("rejects negative fee inputs", () => {
    expect(() =>
      calculateOrderFeeBreakdown({
        itemPriceCents: 100_000,
        subscriptionTier: SubscriptionTier.STANDARD,
        adBoostFeeCents: -1,
      })
    ).toThrow();
  });
});
