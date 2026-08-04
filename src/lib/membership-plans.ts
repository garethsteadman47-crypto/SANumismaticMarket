import { SubscriptionTier } from "@prisma/client";

import { BASE_VERIFICATION_FEE_CENTS, CENTS_PER_RAND, COMMISSION_SCHEDULE_BPS } from "@/lib/utils/fees";

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
  feeRows: MembershipFeeRow[];
  commissionRows: { band: string; rate: string }[];
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
}

function bpsToPercent(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function commissionRowsFor(tier: SubscriptionTier) {
  const schedule = COMMISSION_SCHEDULE_BPS[tier];
  return [
    { band: "Orders R1 – R10,000", rate: bpsToPercent(schedule[1]) },
    { band: "Orders R10,000 – R50,000", rate: bpsToPercent(schedule[2]) },
    { band: "Orders R50,000 – R150,000", rate: bpsToPercent(schedule[3]) },
    { band: "Orders R150,000+", rate: bpsToPercent(schedule[4]) },
  ];
}

/** Public membership matrix — Standard, Silver, Gold (Dealer remains a partner path). */
export const MEMBERSHIP_PLANS: MembershipTierPlan[] = [
  {
    id: SubscriptionTier.STANDARD,
    name: "Standard User",
    tagline: "Free to join",
    target: "Occasional buyers and casual sellers",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    verificationFeeCents: BASE_VERIFICATION_FEE_CENTS,
    commissionRows: commissionRowsFor(SubscriptionTier.STANDARD),
    feeRows: [
      { label: "Verification fee", value: "R15 applied at checkout" },
      { label: "Escrow payout", value: "48-hour post-delivery hold" },
    ],
    features: ["Basic search access", "Buy Now, Make Offer, public auctions"],
    ctaLabel: "Join free",
  },
  {
    id: SubscriptionTier.SILVER,
    name: "Silver Member",
    tagline: "Active hobbyist tier",
    target: "Active hobbyists and mid-tier buyers",
    monthlyPriceCents: 199 * CENTS_PER_RAND,
    yearlyPriceCents: 1_990 * CENTS_PER_RAND,
    verificationFeeCents: BASE_VERIFICATION_FEE_CENTS,
    commissionRows: commissionRowsFor(SubscriptionTier.SILVER),
    feeRows: [
      { label: "Verification fee", value: "Standard R15 at checkout" },
      { label: "Escrow payout", value: "Accelerated 24-hour release" },
    ],
    features: ["Wishlist notifications", "Auction listing access"],
    ctaLabel: "Upgrade to Silver",
  },
  {
    id: SubscriptionTier.GOLD,
    name: "Gold Dealer",
    tagline: "High-volume traders",
    target: "High-volume traders and investors",
    monthlyPriceCents: 499 * CENTS_PER_RAND,
    yearlyPriceCents: 4_990 * CENTS_PER_RAND,
    verificationFeeCents: 0,
    highlighted: true,
    commissionRows: commissionRowsFor(SubscriptionTier.GOLD),
    feeRows: [
      { label: "Verification fee", value: "R0 — 100% waived at checkout" },
      { label: "Escrow payout", value: "Instant settlement on eligible sales" },
    ],
    features: ["Unlimited listings", "Priority indexing", "Early auction access"],
    ctaLabel: "Upgrade to Gold",
  },
];
