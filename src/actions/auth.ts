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

function authErrorMessage(err: AuthError, fallback: string): string {
  // CredentialsSignin is the only case that means a bad email/password.
  // Other AuthErrors (UntrustedHost, Configuration, etc.) used to be
  // misreported as "Invalid email or password."
  if (err.type === "CredentialsSignin") return fallback;
  console.error("[auth]", err.type, err.message);
  return "Sign-in failed. Please try again.";
}

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
      return { success: false, error: authErrorMessage(err, "Invalid email or password.") };
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

  // Sign-in is performed on the client via next-auth/react (see AuthForm) so
  // preview/proxy hosts are not blocked by Server Action origin checks.
  return { success: true };
}

/**
 * Ensures the shared demo account for a tier exists and returns credentials
 * for the client to complete sign-in via next-auth/react. Disabled outside
 * development (see `isDevLoginEnabled`).
 */
export async function prepareDevUserAction(
  tier: SubscriptionTier,
): Promise<AuthActionResult & { email?: string; password?: string }> {
  if (!isDevLoginEnabled()) {
    return { success: false, error: "Demo sign-in is disabled in this environment." };
  }

  await ensureDevUser(tier);
  return { success: true, email: DEMO_USERS[tier].email, password: DEV_DEMO_PASSWORD };
}

/**
 * @deprecated Prefer prepareDevUserAction + client signIn. Kept for any
 * remaining callers; still works when Server Actions are allowed.
 */
export async function devSignInAction(tier: SubscriptionTier): Promise<AuthActionResult> {
  const prepared = await prepareDevUserAction(tier);
  if (!prepared.success || !prepared.email || !prepared.password) {
    return { success: false, error: prepared.success ? "Could not prepare demo user." : prepared.error };
  }

  try {
    await signIn("credentials", { email: prepared.email, password: prepared.password, redirect: false });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: authErrorMessage(err, "Could not sign in as the demo user.") };
    }
    throw err;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirect: false });
}
