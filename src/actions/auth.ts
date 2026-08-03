"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { SubscriptionTier } from "@prisma/client";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEMO_USERS, DEV_DEMO_PASSWORD, ensureDevUser, isDevLoginEnabled } from "@/lib/dev-users";
import {
  signInSchema,
  signUpSchema,
  type AuthActionResult,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validation/auth";

/** Signs in with email + password. Uses `redirect: false` so we can surface a friendly error via toast. */
export async function signInWithCredentialsAction(input: SignInInput): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: "Invalid email or password." };
    }
    throw err;
  }
}

/** Creates a Standard-tier account, then signs the new user in. */
export async function signUpAction(input: SignUpInput): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { name, email, passwordHash, role: "USER", subscriptionTier: SubscriptionTier.STANDARD },
  });
  await db.subscription.create({
    data: { userId: user.id, tier: SubscriptionTier.STANDARD, status: "ACTIVE" },
  });

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        success: false,
        error: "Your account was created, but automatic sign-in failed. Please sign in manually.",
      };
    }
    throw err;
  }
}

/**
 * Signs in as the shared demo account for a given subscription tier, for
 * quickly exercising authenticated flows in development. Disabled outside
 * development as a defense-in-depth measure (the UI that surfaces this is
 * also hidden — see `isDevLoginEnabled`).
 */
export async function devSignInAction(tier: SubscriptionTier): Promise<AuthActionResult> {
  if (!isDevLoginEnabled()) {
    return { success: false, error: "Demo sign-in is disabled in this environment." };
  }

  await ensureDevUser(tier);

  try {
    await signIn("credentials", { email: DEMO_USERS[tier].email, password: DEV_DEMO_PASSWORD, redirect: false });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: "Could not sign in as the demo user." };
    }
    throw err;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirect: false });
}
