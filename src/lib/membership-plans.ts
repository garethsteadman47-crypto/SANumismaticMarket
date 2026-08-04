import { SubscriptionTier } from "@prisma/client";

import { BASE_VERIFICATION_FEE_CENTS, CENTS_PER_RAND, COMMISSION_SCHEDULE_BPS } from "@/lib/utils/fees";

export interface MembershipFeeRow {
  label: string;
  value: string;
}

export type MembershipVisualTone = "standard" | "silver" | "gold";

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
  /** Emphasized upgrade feature shown above the rest of the list. */
  highlightFeature?: string;
  visual: MembershipVisualTone;
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
    name: "Standard Collector",
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
    highlightFeature: "Basic Auction Privileges (Standard Search Indexing)",
    features: ["Buy Now, Make Offer, public auctions", "Wishlist and Wanted requests"],
    visual: "standard",
    ctaLabel: "Join free",
  },
  {
    id: SubscriptionTier.SILVER,
    name: "Silver Member",
    tagline: "R199 / month",
    target: "Active hobbyists and mid-tier sellers",
    monthlyPriceCents: 199 * CENTS_PER_RAND,
    yearlyPriceCents: 1_990 * CENTS_PER_RAND,
    verificationFeeCents: BASE_VERIFICATION_FEE_CENTS,
    commissionRows: commissionRowsFor(SubscriptionTier.SILVER),
    feeRows: [
      { label: "Verification fee", value: "Standard R15 at checkout" },
      { label: "Escrow payout", value: "Accelerated 24-hour release" },
    ],
    highlightFeature: "Priority Auction Indexing (Rank higher in search results)",
    features: ["15 Active Listings", "Wishlist notifications", "Lower seller commissions"],
    visual: "silver",
    ctaLabel: "Upgrade to Silver",
  },
  {
    id: SubscriptionTier.GOLD,
    name: "Gold Power Trader",
    tagline: "R499 / month",
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
    highlightFeature: "VIP Auction Placement (Featured on Homepage and Top of Search)",
    features: ["Unlimited Active Listings and Zero Verification Fees", "Lowest commission bands"],
    visual: "gold",
    ctaLabel: "Upgrade to Gold",
  },
];
