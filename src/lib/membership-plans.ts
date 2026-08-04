import { SubscriptionTier } from "@prisma/client";

import { BASE_VERIFICATION_FEE_CENTS, CENTS_PER_RAND } from "@/lib/utils/fees";

export interface MembershipTierPlan {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  target: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  verificationFeeCents: number;
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
    features: [
      "Standard marketplace commission schedule",
      `R${(BASE_VERIFICATION_FEE_CENTS / CENTS_PER_RAND).toFixed(0)} certification verification deduction at checkout`,
      "Basic search & browse access",
      "Buy Now, Make Offer, and public auctions",
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
    features: [
      "50% reduced verification fee (R7.50)",
      "Wishlist match notifications",
      "5 active auction listings per month",
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
    highlighted: true,
    features: [
      "R0 checkout verification fees (waived)",
      "Early access to premium live auctions",
      "Priority search indexing",
      "Unlimited active listings",
      "Instant settlement velocity on eligible sales",
    ],
    ctaLabel: "Upgrade to Gold",
  },
  {
    id: SubscriptionTier.DEALER,
    name: "Verified Dealer / SAAND Partner",
    tagline: "Commercial partner tier",
    target: "Coin shops, estate liquidators & SAAND members",
    monthlyPriceCents: 999 * CENTS_PER_RAND,
    yearlyPriceCents: 9_990 * CENTS_PER_RAND,
    verificationFeeCents: 0,
    features: [
      "Lowest commission rate on the platform",
      "Official SAAND Verified Dealer badge",
      "Featured storefront page",
      "Bulk CSV inventory upload tool",
      "Waived certification verification fees",
    ],
    ctaLabel: "Apply as Dealer",
  },
];
