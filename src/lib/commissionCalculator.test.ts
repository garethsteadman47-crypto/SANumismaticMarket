import { describe, expect, it } from "vitest";

import {
  calculateTransactionFees,
  calculateTransactionFeesFromCents,
  estimateBaseShippingCostZAR,
  getCommissionRateForTier,
  getSalePriceBracket,
} from "./commissionCalculator";

describe("getSalePriceBracket", () => {
  it("maps the published ZAR brackets", () => {
    expect(getSalePriceBracket(1)).toBe(1);
    expect(getSalePriceBracket(10_000)).toBe(1);
    expect(getSalePriceBracket(10_001)).toBe(2);
    expect(getSalePriceBracket(50_000)).toBe(2);
    expect(getSalePriceBracket(50_001)).toBe(3);
    expect(getSalePriceBracket(150_000)).toBe(3);
    expect(getSalePriceBracket(150_001)).toBe(4);
  });
});

describe("getCommissionRateForTier", () => {
  it("uses symmetric Standard / Silver / Gold rates", () => {
    expect(getCommissionRateForTier(5_000, "STANDARD")).toBe(0.075);
    expect(getCommissionRateForTier(5_000, "SILVER")).toBe(0.06);
    expect(getCommissionRateForTier(5_000, "GOLD")).toBe(0.045);
    expect(getCommissionRateForTier(20_000, "STANDARD")).toBe(0.05);
    expect(getCommissionRateForTier(100_000, "GOLD")).toBe(0.015);
    expect(getCommissionRateForTier(200_000, "SILVER")).toBe(0.015);
  });
});

describe("calculateTransactionFees", () => {
  it("splits shipping 50/50 and charges both sides", () => {
    // R20,000 sale — tier 2. Gold buyer 3%, Standard seller 5%, shipping R180, cert R15.
    const result = calculateTransactionFees(20_000, "GOLD", "STANDARD", 180, 15);

    expect(result.buyerCommissionRate).toBe(0.03);
    expect(result.sellerCommissionRate).toBe(0.05);
    expect(result.buyerFeeZAR).toBe(600);
    expect(result.sellerFeeZAR).toBe(1_000);
    expect(result.buyerShippingShare).toBe(90);
    expect(result.sellerShippingShare).toBe(90);
    expect(result.totalBuyerPayable).toBe(20_000 + 600 + 90);
    expect(result.netSellerPayout).toBe(20_000 - 1_000 - 90 - 15);
  });

  it("handles odd shipping cents by giving remainder to the seller share", () => {
    const result = calculateTransactionFees(1_000, "STANDARD", "STANDARD", 101, 0);
    expect(result.buyerShippingShare + result.sellerShippingShare).toBe(101);
  });
});

describe("calculateTransactionFeesFromCents", () => {
  it("round-trips through cents without drift on clean amounts", () => {
    const result = calculateTransactionFeesFromCents({
      salePriceCents: 2_000_000,
      buyerTier: "GOLD",
      sellerTier: "STANDARD",
      baseShippingCostCents: 18_000,
      certFeeCents: 1_500,
    });
    expect(result.totalBuyerPayableCents).toBe(2_069_000);
    expect(result.netSellerPayoutCents).toBe(1_889_500);
    expect(result.buyerCommissionRateBps).toBe(300);
    expect(result.sellerCommissionRateBps).toBe(500);
  });
});

describe("estimateBaseShippingCostZAR", () => {
  it("scales with sale value", () => {
    expect(estimateBaseShippingCostZAR(5_000)).toBe(120);
    expect(estimateBaseShippingCostZAR(25_000)).toBe(180);
    expect(estimateBaseShippingCostZAR(75_000)).toBe(350);
    expect(estimateBaseShippingCostZAR(200_000)).toBe(450);
  });
});
