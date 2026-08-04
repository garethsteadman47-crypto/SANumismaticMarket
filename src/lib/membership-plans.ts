import { SubscriptionTier } from "@prisma/client";

import { BASE_VERIFICATION_FEE_CENTS, CENTS_PER_RAND } from "@/lib/utils/fees";

export interface MembershipFeeRow {
  label: string;
  value: string;
}

export interface MembershipTierPlan {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  target: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  verificationFeeCents: number;
  /** Headline seller commission rate shown on the membership matrix (marketing / published rate). */
  commissionRatePercent: number;
  feeRows: MembershipFeeRow[];
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
}

export const MEMBERSHIP_PLANS: MembershipTierPlan[] = [
  {
    id: SubscriptionTier.STANDARD,
    name: "Standard Collector",
    tagline: "Free to join",
    target: "Occasional buyers & casual sellers",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    verificationFeeCents: BASE_VERIFICATION_FEE_CENTS,
    commissionRatePercent: 5,
    feeRows: [
      { label: "Seller commission", value: "5.0% per completed sale" },
      { label: "Verification fee", value: "R15 deduction at checkout per item" },
      { label: "Active listings limit", value: "Up to 3 active items simultaneously" },
      { label: "Escrow payout", value: "Standard 48-hour post-delivery release" },
    ],
    features: [
      "Basic search & browse access",
      "Buy Now, Make Offer, and public auctions",
      "MintMark Buyer Protection on every purchase",
    ],
    ctaLabel: "Join free",
  },
  {
    id: SubscriptionTier.SILVER,
    name: "Silver Collector",
    tagline: "Active hobbyist tier",
    target: "Active hobbyists & mid-tier buyers",
    monthlyPriceCents: 199 * CENTS_PER_RAND,
    yearlyPriceCents: 1_990 * CENTS_PER_RAND,
    verificationFeeCents: Math.round(BASE_VERIFICATION_FEE_CENTS / 2),
    commissionRatePercent: 3.5,
    feeRows: [
      { label: "Seller commission", value: "3.5% per completed sale" },
      { label: "Verification fee", value: "50% discount — R7.50 at checkout" },
      { label: "Active listings limit", value: "15 active listings + auction access" },
      { label: "Escrow payout", value: "Accelerated 24-hour post-delivery release" },
    ],
    features: [
      "Wishlist match notifications",
      "Auction listing access",
      "Reduced commission vs Standard",
    ],
    ctaLabel: "Upgrade to Silver",
  },
  {
    id: SubscriptionTier.GOLD,
    name: "Gold Power Trader",
    tagline: "High-volume traders",
    target: "High-volume traders & investors",
    monthlyPriceCents: 499 * CENTS_PER_RAND,
    yearlyPriceCents: 4_990 * CENTS_PER_RAND,
    verificationFeeCents: 0,
    commissionRatePercent: 2,
    highlighted: true,
    feeRows: [
      { label: "Seller commission", value: "2.0% per completed sale" },
      { label: "Verification fee", value: "R0 — 100% waived at checkout" },
      { label: "Active listings limit", value: "Unlimited + priority indexing" },
      { label: "Escrow payout", value: "Instant settlement on eligible sales" },
    ],
    features: [
      "Wishlist instant notification trigger",
      "Early access auction bidding",
      "Priority search indexing",
    ],
    ctaLabel: "Upgrade to Gold",
  },
  {
    id: SubscriptionTier.DEALER,
    name: "SAAND Verified Dealer",
    tagline: "Commercial partner tier",
    target: "Coin shops, estate liquidators & SAAND members",
    monthlyPriceCents: 999 * CENTS_PER_RAND,
    yearlyPriceCents: 9_990 * CENTS_PER_RAND,
    verificationFeeCents: 0,
    commissionRatePercent: 1.5,
    feeRows: [
      { label: "Seller commission", value: "1.5% bulk commercial rate" },
      { label: "Verification fee", value: "R0 — waived" },
      { label: "Active listings limit", value: "Unlimited + bulk CSV upload" },
      { label: "Escrow payout", value: "Instant settlement on eligible sales" },
    ],
    features: [
      "Official SAAND Verified Dealer Badge",
      "Custom storefront page",
      "1 complimentary homepage banner ad spot per month",
    ],
    ctaLabel: "Apply as Dealer",
  },
];
