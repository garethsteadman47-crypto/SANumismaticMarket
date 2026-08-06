import bcrypt from "bcryptjs";
import { SubscriptionTier } from "@prisma/client";

import { db } from "@/lib/db";
import type { AccoladeId } from "@/lib/accolades";

/**
 * Shared demo accounts — emails/names must match `src/lib/demo-seed.ts` MOCK_USERS
 * so the login card hint and one-click switcher agree with the seeded dealers.
 */
export const DEV_DEMO_PASSWORD = "DemoPass123!";

export const DEMO_USERS: Record<
  SubscriptionTier,
  {
    email: string;
    name: string;
    isSaandDealer: boolean;
    isVerified: boolean;
    isCoinClubMember: boolean;
    completedSalesCount: number;
    phoneNumber: string;
    location: string;
    bio: string;
    avatarUrl: string;
    bannerUrl: string;
    accolades: AccoladeId[];
  }
> = {
  STANDARD: {
    email: "seller@randburgfinds.co.za",
    name: "Randburg Rare Finds",
    isSaandDealer: false,
    isVerified: false,
    isCoinClubMember: false,
    completedSalesCount: 9,
    phoneNumber: "+27 11 555 0101",
    location: "Randburg, GP",
    bio: "Local finder of decimal sets, commemoratives, and affordable starter cabinet pieces.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1605335805561-12c8a245585f?auto=format&fit=crop&w=1600&q=80",
    accolades: ["EARLY_ADOPTER"],
  },
  SILVER: {
    email: "info@capeproofs.co.za",
    name: "Cape Proof Collectibles",
    isSaandDealer: false,
    isVerified: true,
    isCoinClubMember: true,
    completedSalesCount: 67,
    phoneNumber: "+27 21 555 0142",
    location: "Cape Town, WC",
    bio: "Cape Town boutique for Union proofs, banknotes, and high-grade circulating silver.",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1599557997972-00ab56bc7404?auto=format&fit=crop&w=1600&q=80",
    accolades: ["COIN_CLUB", "EARLY_ADOPTER"],
  },
  GOLD: {
    email: "zar@zarcoins.co.za",
    name: "Veldpond & ZAR Specialist",
    isSaandDealer: true,
    isVerified: true,
    isCoinClubMember: true,
    completedSalesCount: 128,
    phoneNumber: "+27 82 555 0199",
    location: "Johannesburg, GP",
    bio: "Focused on ZAR gold rarities, Veldponde, and early Kruger crowns with full provenance.",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1605177991950-8de6fbd238ac?auto=format&fit=crop&w=1600&q=80",
    accolades: ["SAAND_VERIFIED", "COIN_CLUB"],
  },
  DEALER: {
    email: "dealer@gautengcoins.co.za",
    name: "Gauteng Numismatic Exchange",
    isSaandDealer: true,
    isVerified: true,
    isCoinClubMember: true,
    completedSalesCount: 214,
    phoneNumber: "+27 12 555 0201",
    location: "Pretoria, GP",
    bio: "Verified SAAND dealer specialising in Krugerrands, international trade dollars, and Republic bullion.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=1600&q=80",
    accolades: ["SAAND_VERIFIED", "COIN_CLUB", "TOP_SELLER_100", "EARLY_ADOPTER"],
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
      isVerified: demo.isVerified,
      isCoinClubMember: demo.isCoinClubMember,
      completedSalesCount: demo.completedSalesCount,
      phoneNumber: demo.phoneNumber,
      location: demo.location,
      bio: demo.bio,
      avatarUrl: demo.avatarUrl,
      bannerUrl: demo.bannerUrl,
      image: demo.avatarUrl,
      accolades: demo.accolades,
    },
    create: {
      email: demo.email,
      name: demo.name,
      passwordHash,
      role: "USER",
      subscriptionTier: tier,
      isSaandDealer: demo.isSaandDealer,
      isVerified: demo.isVerified,
      isCoinClubMember: demo.isCoinClubMember,
      completedSalesCount: demo.completedSalesCount,
      phoneNumber: demo.phoneNumber,
      location: demo.location,
      bio: demo.bio,
      avatarUrl: demo.avatarUrl,
      bannerUrl: demo.bannerUrl,
      image: demo.avatarUrl,
      accolades: demo.accolades,
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
