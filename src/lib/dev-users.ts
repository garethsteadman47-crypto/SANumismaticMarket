import bcrypt from "bcryptjs";
import { SubscriptionTier } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Dev/demo accounts, one per subscription tier, so the authenticated
 * flows (creating a listing, seeing seller-tier-specific payout copy,
 * etc.) can be exercised without building full onboarding first.
 *
 * Gated to non-production environments — see `isDevLoginEnabled`.
 */
export const DEV_DEMO_PASSWORD = "DemoPass123!";

export const DEMO_USERS: Record<SubscriptionTier, { email: string; name: string }> = {
  STANDARD: { email: "standard@demo.local", name: "Demo Standard User" },
  SILVER: { email: "silver@demo.local", name: "Demo Silver Trader" },
  GOLD: { email: "gold@demo.local", name: "Demo Gold Dealer" },
};

export function isDevLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Idempotently creates (or re-syncs) the demo account for a given tier. */
export async function ensureDevUser(tier: SubscriptionTier) {
  const { email, name } = DEMO_USERS[tier];
  const passwordHash = await bcrypt.hash(DEV_DEMO_PASSWORD, 10);

  const user = await db.user.upsert({
    where: { email },
    update: { subscriptionTier: tier, passwordHash },
    create: { email, name, passwordHash, role: "USER", subscriptionTier: tier },
  });

  await db.subscription.upsert({
    where: { userId: user.id },
    update: { tier, status: "ACTIVE" },
    create: { userId: user.id, tier, status: "ACTIVE" },
  });

  return user;
}
