import { SubscriptionTier } from "@prisma/client";

/**
 * Dynamic, value-based commission engine.
 *
 * All monetary amounts in this module are **integer ZA cents** — never
 * floats — matching the convention established in `prisma/schema.prisma`.
 * Rates are expressed in basis points (bps); 100 bps = 1%.
 */

export const CENTS_PER_RAND = 100;
export const VAT_RATE_BPS = 1500; // SARS standard rate: 15%

/** Flat certification verification fee (ZA cents) before tier discounts. */
export const BASE_VERIFICATION_FEE_CENTS = 1_500; // R15

export type PriceTier = 1 | 2 | 3 | 4;

/** Upper bound (inclusive) of each price tier, in ZA cents. */
export const PRICE_TIER_BOUNDARIES_CENTS: Record<Exclude<PriceTier, 4>, number> = {
  1: 10_000 * CENTS_PER_RAND, // R10,000
  2: 50_000 * CENTS_PER_RAND, // R50,000
  3: 150_000 * CENTS_PER_RAND, // R150,000
};

/**
 * Commission rate, in basis points, by subscription tier and price tier.
 *
 *              Tier 1 (≤R10k)  Tier 2 (≤R50k)  Tier 3 (≤R150k)  Tier 4 (>R150k)
 * STANDARD          7.5%            5%              2.5%             2%
 * SILVER              6%            4%                2%           1.5%
 * GOLD              4.5%            3%              1.5%             1%
 * DEALER            3.5%            2%                1%          0.75%
 */
export const COMMISSION_SCHEDULE_BPS: Record<SubscriptionTier, Record<PriceTier, number>> = {
  STANDARD: { 1: 750, 2: 500, 3: 250, 4: 200 },
  SILVER: { 1: 600, 2: 400, 3: 200, 4: 150 },
  GOLD: { 1: 450, 2: 300, 3: 150, 4: 100 },
  DEALER: { 1: 350, 2: 200, 3: 100, 4: 75 },
};

/**
 * Certification verification fee charged at checkout, by membership tier.
 * STANDARD pays full R15; SILVER half (R7.50); GOLD/DEALER waived.
 */
export function getVerificationFeeCents(tier: SubscriptionTier): number {
  switch (tier) {
    case SubscriptionTier.STANDARD:
      return BASE_VERIFICATION_FEE_CENTS;
    case SubscriptionTier.SILVER:
      return Math.round(BASE_VERIFICATION_FEE_CENTS / 2);
    case SubscriptionTier.GOLD:
    case SubscriptionTier.DEALER:
      return 0;
    default:
      return BASE_VERIFICATION_FEE_CENTS;
  }
}

export class InvalidPriceError extends Error {
  constructor(priceCents: number) {
    super(`Price must be a positive integer number of cents, received: ${priceCents}`);
    this.name = "InvalidPriceError";
  }
}

function assertValidPriceCents(priceCents: number): void {
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    throw new InvalidPriceError(priceCents);
  }
}

/**
 * Determines which of the four value tiers a sale price falls into.
 *
 * Tier 4 is the uncapped, open-ended top bracket — there is no upper
 * boundary, so every listing above R150,000 (any amount, however large)
 * still resolves to tier 4.
 */
export function getPriceTier(priceCents: number): PriceTier {
  assertValidPriceCents(priceCents);
  if (priceCents <= PRICE_TIER_BOUNDARIES_CENTS[1]) return 1;
  if (priceCents <= PRICE_TIER_BOUNDARIES_CENTS[2]) return 2;
  if (priceCents <= PRICE_TIER_BOUNDARIES_CENTS[3]) return 3;
  return 4;
}

/** Looks up the flat commission rate (bps) that applies to the whole sale. */
export function getCommissionRateBps(priceCents: number, tier: SubscriptionTier): number {
  const priceTier = getPriceTier(priceCents);
  return COMMISSION_SCHEDULE_BPS[tier][priceTier];
}

/** Rounds a bps-based fee to the nearest cent (banker's-rounding-free — half up). */
export function applyBps(amountCents: number, bps: number): number {
  return Math.round((amountCents * bps) / 10_000);
}

export interface CommissionResult {
  priceTier: PriceTier;
  rateBps: number;
  commissionAmountCents: number;
}

/**
 * Calculates the platform's commission on a sale, given the item's final
 * sale price and the seller's subscription tier at the time of sale.
 */
export function calculateCommission(priceCents: number, subscriptionTier: SubscriptionTier): CommissionResult {
  assertValidPriceCents(priceCents);
  const priceTier = getPriceTier(priceCents);
  const rateBps = COMMISSION_SCHEDULE_BPS[subscriptionTier][priceTier];
  return {
    priceTier,
    rateBps,
    commissionAmountCents: applyBps(priceCents, rateBps),
  };
}

/** 15% SARS output VAT on a given fee amount (e.g. the platform's own commission/fee revenue). */
export function calculateVat(amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error(`VAT base amount must be a non-negative integer number of cents, received: ${amountCents}`);
  }
  return applyBps(amountCents, VAT_RATE_BPS);
}

export interface OrderFeeInput {
  itemPriceCents: number;
  subscriptionTier: SubscriptionTier;
  /** From `Verification.feeCents` when the listing was a certified/graded item. Defaults to 0. */
  verificationFeeCents?: number;
  /** Any ad-boost spend attributable to this sale. Defaults to 0. */
  adBoostFeeCents?: number;
}

export interface OrderFeeBreakdown {
  itemPriceCents: number;
  priceTier: PriceTier;
  commissionRateBps: number;
  commissionAmountCents: number;
  verificationFeeCents: number;
  adBoostFeeCents: number;
  /** 15% output VAT, charged on the platform's own fee revenue (commission + cert fee + ad boosts). */
  platformVatCents: number;
  /** Sum of everything the platform retains: commission + cert fee + ad boosts + VAT. */
  totalPlatformFeesCents: number;
  /** Net amount due to the seller: itemPriceCents - totalPlatformFeesCents. */
  sellerPayoutCents: number;
}

/**
 * Full fee breakdown for a completed sale, mirroring the `Order` model's
 * money fields 1:1 so this can be persisted directly at checkout/settlement.
 */
export function calculateOrderFeeBreakdown({
  itemPriceCents,
  subscriptionTier,
  verificationFeeCents = 0,
  adBoostFeeCents = 0,
}: OrderFeeInput): OrderFeeBreakdown {
  assertValidPriceCents(itemPriceCents);
  if (verificationFeeCents < 0 || adBoostFeeCents < 0) {
    throw new Error("Fee amounts cannot be negative.");
  }

  const { priceTier, rateBps, commissionAmountCents } = calculateCommission(itemPriceCents, subscriptionTier);

  const platformVatCents = calculateVat(commissionAmountCents + verificationFeeCents + adBoostFeeCents);
  const totalPlatformFeesCents = commissionAmountCents + verificationFeeCents + adBoostFeeCents + platformVatCents;
  const sellerPayoutCents = itemPriceCents - totalPlatformFeesCents;

  return {
    itemPriceCents,
    priceTier,
    commissionRateBps: rateBps,
    commissionAmountCents,
    verificationFeeCents,
    adBoostFeeCents,
    platformVatCents,
    totalPlatformFeesCents,
    sellerPayoutCents,
  };
}
