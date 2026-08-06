import { SubscriptionTier } from "@prisma/client";

import { CENTS_PER_RAND, getVerificationFeeCents } from "@/lib/utils/fees";
import { centsToRands, randsToCents } from "@/lib/utils/currency";

/**
 * Dual-sided, symmetric commission engine with 50/50 split shipping.
 *
 * Amounts in this module are **ZAR floats** (Rand), matching the product
 * fee schedule. Prefer the `*Cents` helpers when persisting to Prisma
 * (which stores money as integer ZA cents elsewhere in the app).
 */

export type CommissionTierName = "STANDARD" | "SILVER" | "GOLD" | "DEALER";

/** Sale-price brackets in ZAR (upper bound inclusive, except the open top band). */
const PRICE_BRACKETS_ZAR = [
  { max: 10_000, key: 1 as const },
  { max: 50_000, key: 2 as const },
  { max: 150_000, key: 3 as const },
  { max: Number.POSITIVE_INFINITY, key: 4 as const },
];

/**
 * Commission rate (decimal) by membership tier and sale-price bracket.
 *
 *              ≤R10k   ≤R50k   ≤R150k   >R150k
 * STANDARD      7.5%    5.0%     2.5%     2.0%
 * SILVER        6.0%    4.0%     2.0%     1.5%
 * GOLD          4.5%    3.0%     1.5%     1.0%
 * DEALER        3.5%    2.0%     1.0%    0.75%  (partner path)
 */
export const COMMISSION_RATES: Record<CommissionTierName, Record<1 | 2 | 3 | 4, number>> = {
  STANDARD: { 1: 0.075, 2: 0.05, 3: 0.025, 4: 0.02 },
  SILVER: { 1: 0.06, 2: 0.04, 3: 0.02, 4: 0.015 },
  GOLD: { 1: 0.045, 2: 0.03, 3: 0.015, 4: 0.01 },
  DEALER: { 1: 0.035, 2: 0.02, 3: 0.01, 4: 0.0075 },
};

export function normalizeCommissionTier(tier: string | SubscriptionTier | null | undefined): CommissionTierName {
  const raw = String(tier ?? "STANDARD").trim().toUpperCase();
  if (raw === "SILVER") return "SILVER";
  if (raw === "GOLD") return "GOLD";
  if (raw === "DEALER") return "DEALER";
  return "STANDARD";
}

export function getSalePriceBracket(salePriceZAR: number): 1 | 2 | 3 | 4 {
  if (!Number.isFinite(salePriceZAR) || salePriceZAR <= 0) {
    throw new Error(`salePrice must be a positive ZAR amount, received: ${salePriceZAR}`);
  }
  for (const bracket of PRICE_BRACKETS_ZAR) {
    if (salePriceZAR <= bracket.max) return bracket.key;
  }
  return 4;
}

export function getCommissionRateForTier(salePriceZAR: number, tier: string | SubscriptionTier): number {
  const bracket = getSalePriceBracket(salePriceZAR);
  return COMMISSION_RATES[normalizeCommissionTier(tier)][bracket];
}

/**
 * Heuristic insured shipping quote in ZAR when the listing has no explicit
 * courier quote — scales with sale value (Courier Guy → RAM Valuables).
 */
export function estimateBaseShippingCostZAR(salePriceZAR: number): number {
  if (salePriceZAR >= 150_000) return 450;
  if (salePriceZAR >= 50_000) return 350;
  if (salePriceZAR >= 10_000) return 180;
  return 120;
}

export interface TransactionFeeBreakdown {
  salePrice: number;
  buyerTier: CommissionTierName;
  sellerTier: CommissionTierName;
  priceBracket: 1 | 2 | 3 | 4;

  buyerCommissionRate: number;
  sellerCommissionRate: number;
  buyerFeeZAR: number;
  sellerFeeZAR: number;

  totalShippingCost: number;
  buyerShippingShare: number;
  sellerShippingShare: number;

  certFee: number;
  totalBuyerPayable: number;
  netSellerPayout: number;
}

function roundZar(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Dual-sided fee calculation: buyer and seller each pay their own tiered
 * commission on the sale price, and split `baseShippingCost` 50/50.
 */
export function calculateTransactionFees(
  salePrice: number,
  buyerTier: string,
  sellerTier: string,
  baseShippingCost: number,
  certFee = 0,
): TransactionFeeBreakdown {
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    throw new Error(`salePrice must be a positive ZAR amount, received: ${salePrice}`);
  }
  if (!Number.isFinite(baseShippingCost) || baseShippingCost < 0) {
    throw new Error(`baseShippingCost must be a non-negative ZAR amount, received: ${baseShippingCost}`);
  }
  if (!Number.isFinite(certFee) || certFee < 0) {
    throw new Error(`certFee must be a non-negative ZAR amount, received: ${certFee}`);
  }

  const buyer = normalizeCommissionTier(buyerTier);
  const seller = normalizeCommissionTier(sellerTier);
  const priceBracket = getSalePriceBracket(salePrice);

  const buyerCommissionRate = COMMISSION_RATES[buyer][priceBracket];
  const sellerCommissionRate = COMMISSION_RATES[seller][priceBracket];

  const buyerFeeZAR = roundZar(salePrice * buyerCommissionRate);
  const sellerFeeZAR = roundZar(salePrice * sellerCommissionRate);

  const totalShippingCost = roundZar(baseShippingCost);
  const buyerShippingShare = roundZar(totalShippingCost / 2);
  const sellerShippingShare = roundZar(totalShippingCost - buyerShippingShare);

  const totalBuyerPayable = roundZar(salePrice + buyerFeeZAR + buyerShippingShare);
  const netSellerPayout = roundZar(salePrice - sellerFeeZAR - sellerShippingShare - certFee);

  return {
    salePrice: roundZar(salePrice),
    buyerTier: buyer,
    sellerTier: seller,
    priceBracket,
    buyerCommissionRate,
    sellerCommissionRate,
    buyerFeeZAR,
    sellerFeeZAR,
    totalShippingCost,
    buyerShippingShare,
    sellerShippingShare,
    certFee: roundZar(certFee),
    totalBuyerPayable,
    netSellerPayout,
  };
}

/** Cents-oriented wrapper used by checkout / Order persistence. */
export function calculateTransactionFeesFromCents(input: {
  salePriceCents: number;
  buyerTier: string | SubscriptionTier;
  sellerTier: string | SubscriptionTier;
  baseShippingCostCents?: number;
  certFeeCents?: number;
}): TransactionFeeBreakdown & {
  salePriceCents: number;
  buyerFeeCents: number;
  sellerFeeCents: number;
  totalShippingCostCents: number;
  buyerShippingShareCents: number;
  sellerShippingShareCents: number;
  certFeeCents: number;
  totalBuyerPayableCents: number;
  netSellerPayoutCents: number;
  buyerCommissionRateBps: number;
  sellerCommissionRateBps: number;
} {
  const salePrice = centsToRands(input.salePriceCents);
  const baseShipping =
    input.baseShippingCostCents != null
      ? centsToRands(input.baseShippingCostCents)
      : estimateBaseShippingCostZAR(salePrice);
  const certFee =
    input.certFeeCents != null
      ? centsToRands(input.certFeeCents)
      : centsToRands(getVerificationFeeCents(normalizeCommissionTier(input.sellerTier) as SubscriptionTier));

  const zar = calculateTransactionFees(salePrice, String(input.buyerTier), String(input.sellerTier), baseShipping, certFee);

  return {
    ...zar,
    salePriceCents: randsToCents(zar.salePrice),
    buyerFeeCents: randsToCents(zar.buyerFeeZAR),
    sellerFeeCents: randsToCents(zar.sellerFeeZAR),
    totalShippingCostCents: randsToCents(zar.totalShippingCost),
    buyerShippingShareCents: randsToCents(zar.buyerShippingShare),
    sellerShippingShareCents: randsToCents(zar.sellerShippingShare),
    certFeeCents: randsToCents(zar.certFee),
    totalBuyerPayableCents: randsToCents(zar.totalBuyerPayable),
    netSellerPayoutCents: randsToCents(zar.netSellerPayout),
    buyerCommissionRateBps: Math.round(zar.buyerCommissionRate * 10_000),
    sellerCommissionRateBps: Math.round(zar.sellerCommissionRate * 10_000),
  };
}

export { CENTS_PER_RAND };
