import bcrypt from "bcryptjs";
import { SubscriptionTier } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Shared demo accounts — emails/names must match `prisma/seed.ts` MOCK_USERS
 * so the login card hint (`bassani@demo.local`) and one-click switcher agree.
 */
export const DEV_DEMO_PASSWORD = "DemoPass123!";

export const DEMO_USERS: Record<
  SubscriptionTier,
  {
    email: string;
    name: string;
    isSaandDealer: boolean;
    isCoinClubMember: boolean;
    completedSalesCount: number;
  }
> = {
  STANDARD: {
    email: "casual@demo.local",
    name: "CasualCollector",
    isSaandDealer: false,
    isCoinClubMember: false,
    completedSalesCount: 0,
  },
  SILVER: {
    email: "unionhunter@demo.local",
    name: "UnionHunter",
    isSaandDealer: false,
    isCoinClubMember: true,
    completedSalesCount: 12,
  },
  GOLD: {
    email: "pretoriagold@demo.local",
    name: "PretoriaGold",
    isSaandDealer: false,
    isCoinClubMember: true,
    completedSalesCount: 54,
  },
  DEALER: {
    email: "bassani@demo.local",
    name: "Bassani_Numismatics",
    isSaandDealer: true,
    isCoinClubMember: true,
    completedSalesCount: 186,
  },
};

const DEMO_EMAIL_TO_TIER = Object.fromEntries(
  (Object.keys(DEMO_USERS) as SubscriptionTier[]).map((tier) => [DEMO_USERS[tier].email, tier]),
) as Record<string, SubscriptionTier>;

/** True for local/dev, Vercel preview deploys, or when DEMO_LOGIN_ENABLED=1. */
export function isDevLoginEnabled(): boolean {
  if (process.env.DEMO_LOGIN_ENABLED === "1" || process.env.DEMO_LOGIN_ENABLED === "true") {
    return true;
  }
  if (process.env.VERCEL_ENV === "preview") return true;
  return process.env.NODE_ENV !== "production";
}

/** Idempotently creates (or re-syncs) the demo account for a given tier. */
export async function ensureDevUser(tier: SubscriptionTier) {
  const demo = DEMO_USERS[tier];
  const passwordHash = await bcrypt.hash(DEV_DEMO_PASSWORD, 10);

  const user = await db.user.upsert({
    where: { email: demo.email },
    update: {
      name: demo.name,
      subscriptionTier: tier,
      passwordHash,
      isSaandDealer: demo.isSaandDealer,
      isCoinClubMember: demo.isCoinClubMember,
      completedSalesCount: demo.completedSalesCount,
    },
    create: {
      email: demo.email,
      name: demo.name,
      passwordHash,
      role: "USER",
      subscriptionTier: tier,
      isSaandDealer: demo.isSaandDealer,
      isCoinClubMember: demo.isCoinClubMember,
      completedSalesCount: demo.completedSalesCount,
    },
  });

  await db.subscription.upsert({
    where: { userId: user.id },
    update: { tier, status: "ACTIVE" },
    create: { userId: user.id, tier, status: "ACTIVE" },
  });

  return user;
}

/** Ensures every tier demo account exists (used on `/login` for Vercel/Atlas). */
export async function ensureAllDemoUsers() {
  await Promise.all(
    (Object.keys(DEMO_USERS) as SubscriptionTier[]).map((tier) => ensureDevUser(tier)),
  );
}

/**
 * If `email` is a known demo account and `password` matches the shared demo
 * password, ensure that user exists and return it. Otherwise return null.
 * Lets Vercel/Atlas work without a manual `npm run db:seed`.
 */
export async function ensureDemoUserIfMatchingCredentials(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const tier = DEMO_EMAIL_TO_TIER[normalized];
  if (!tier) return null;
  if (password !== DEV_DEMO_PASSWORD) return null;
  return ensureDevUser(tier);
}
