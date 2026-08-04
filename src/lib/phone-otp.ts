import { db } from "@/lib/db";
import { generateOtpCode, isOtpFormatValid, MAX_OTP_ATTEMPTS } from "@/lib/otp";
import { maskPhone } from "@/lib/phone";

/**
 * Phone-number OTP sign-in flow. No real SMS gateway is wired up yet — in
 * non-production environments the generated code is logged server-side AND
 * returned to the caller so the sign-in UI can display it directly (the
 * same demo pattern used for the delivery OTP on escrow orders). To go
 * live, replace the `console.log` below with a real gateway call (e.g.
 * Clickatell, Twilio, or an SA-local aggregator) and stop returning
 * `demoCode` outside development.
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type PhoneOtpResult =
  | { success: true; demoCode?: string }
  | { success: false; error: string };

export async function requestPhoneOtp(phone: string): Promise<PhoneOtpResult> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.phoneVerification.create({
    data: { phone, code, expiresAt },
  });

  // TODO: integrate a real SMS gateway here instead of logging.
  console.log(`[phone-otp] Sign-in code for ${maskPhone(phone)}: ${code}`);

  const isProduction = process.env.NODE_ENV === "production";
  return { success: true, demoCode: isProduction ? undefined : code };
}

export interface VerifiedPhoneUser {
  id: string;
  name: string | null;
  email: string;
  phone: string;
}

/**
 * Verifies a submitted code against the most recent unexpired challenge for
 * this phone number, then finds-or-creates the corresponding User.
 *
 * User.email is a required unique field in the schema (see
 * `prisma/schema.prisma`), so phone-only accounts get a synthetic
 * `phone-<digits>@users.coinvault.local` placeholder email rather than
 * requiring a broader (and riskier) schema change to make email optional.
 * Display code always prefers `name` over `email`, so this is never shown
 * to users.
 */
export async function verifyPhoneOtp(phone: string, submittedCode: string): Promise<PhoneOtpResult> {
  if (!isOtpFormatValid(submittedCode)) {
    return { success: false, error: "Enter the 6-digit code." };
  }

  const challenge = await db.phoneVerification.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) {
    return { success: false, error: "No code was requested for this number. Please request a new one." };
  }
  if (challenge.verifiedAt) {
    return { success: false, error: "This code has already been used. Please request a new one." };
  }
  if (challenge.attemptCount >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: "Too many incorrect attempts. Please request a new code." };
  }
  if (new Date() > challenge.expiresAt) {
    return { success: false, error: "This code has expired. Please request a new one." };
  }

  if (challenge.code !== submittedCode.trim()) {
    await db.phoneVerification.update({
      where: { id: challenge.id },
      data: { attemptCount: challenge.attemptCount + 1 },
    });
    const remaining = MAX_OTP_ATTEMPTS - (challenge.attemptCount + 1);
    return {
      success: false,
      error: remaining > 0 ? `Incorrect code. ${remaining} attempt(s) remaining.` : "Incorrect code. Please request a new one.",
    };
  }

  await db.phoneVerification.update({ where: { id: challenge.id }, data: { verifiedAt: new Date() } });

  return { success: true };
}

/** Finds the user for a verified phone number, creating a lightweight account on first sign-in. */
export async function findOrCreateUserForPhone(phone: string): Promise<VerifiedPhoneUser> {
  const existing = await db.user.findFirst({ where: { phone } });
  if (existing) {
    if (!existing.phoneVerifiedAt) {
      await db.user.update({ where: { id: existing.id }, data: { phoneVerifiedAt: new Date() } });
    }
    return { id: existing.id, name: existing.name, email: existing.email, phone };
  }

  const placeholderEmail = `phone-${phone.replace(/\D/g, "")}@users.coinvault.local`;
  const user = await db.user.create({
    data: {
      email: placeholderEmail,
      phone,
      phoneVerifiedAt: new Date(),
      role: "USER",
      subscriptionTier: "STANDARD",
    },
  });
  await db.subscription.create({
    data: { userId: user.id, tier: "STANDARD", status: "ACTIVE" },
  });

  return { id: user.id, name: user.name, email: user.email, phone };
}
