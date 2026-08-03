import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Integration test: exercises the phone-number OTP request/verify flow in
 * `lib/phone-otp.ts` against a real MongoDB replica set — mirrors
 * `lib/orders.integration.test.ts`. Run with `npm run test:integration`.
 */

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri("sa_numismatic_marketplace_phone_otp_test");
  process.env.DATABASE_URL = uri;

  const { db } = await import("@/lib/db");
  await db.$runCommandRaw({
    createIndexes: "User",
    indexes: [{ key: { email: 1 }, name: "User_email_key", unique: true }],
  });
}, 120_000);

afterAll(async () => {
  const { db } = await import("@/lib/db");
  await db.$disconnect();
  await replSet.stop();
  delete (globalThis as { __prisma?: unknown }).__prisma;
});

let uniqueCounter = 0;
function uniquePhone(): string {
  uniqueCounter += 1;
  // Valid SA mobile shape, distinct per test.
  const suffix = String(uniqueCounter).padStart(6, "0");
  return `+2782${suffix}`;
}

describe("requestPhoneOtp + verifyPhoneOtp (integration)", () => {
  it("accepts the exact code that was generated", async () => {
    const { requestPhoneOtp, verifyPhoneOtp } = await import("@/lib/phone-otp");
    const { db } = await import("@/lib/db");
    const phone = uniquePhone();

    const requested = await requestPhoneOtp(phone);
    expect(requested.success).toBe(true);
    if (!requested.success) return;
    expect(requested.demoCode).toBeDefined();

    const stored = await db.phoneVerification.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
    expect(stored?.code).toBe(requested.demoCode);

    const verified = await verifyPhoneOtp(phone, requested.demoCode!);
    expect(verified.success).toBe(true);
  });

  it("rejects an incorrect code and increments attemptCount", async () => {
    const { requestPhoneOtp, verifyPhoneOtp } = await import("@/lib/phone-otp");
    const { db } = await import("@/lib/db");
    const phone = uniquePhone();

    await requestPhoneOtp(phone);
    const wrong = await verifyPhoneOtp(phone, "000000");
    expect(wrong.success).toBe(false);

    const stored = await db.phoneVerification.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
    expect(stored?.attemptCount).toBe(1);
  });

  it("rejects reusing an already-verified code", async () => {
    const { requestPhoneOtp, verifyPhoneOtp } = await import("@/lib/phone-otp");
    const phone = uniquePhone();

    const requested = await requestPhoneOtp(phone);
    expect(requested.success).toBe(true);
    if (!requested.success) return;

    const first = await verifyPhoneOtp(phone, requested.demoCode!);
    expect(first.success).toBe(true);

    const second = await verifyPhoneOtp(phone, requested.demoCode!);
    expect(second.success).toBe(false);
  });

  it("rejects a code once the maximum attempt count is reached", async () => {
    const { requestPhoneOtp, verifyPhoneOtp } = await import("@/lib/phone-otp");
    const { MAX_OTP_ATTEMPTS } = await import("@/lib/otp");
    const phone = uniquePhone();

    const requested = await requestPhoneOtp(phone);
    expect(requested.success).toBe(true);
    if (!requested.success) return;

    for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
      await verifyPhoneOtp(phone, "000000");
    }

    // Even the *correct* code should now be rejected — attempts exhausted.
    const finalAttempt = await verifyPhoneOtp(phone, requested.demoCode!);
    expect(finalAttempt.success).toBe(false);
    if (finalAttempt.success) return;
    expect(finalAttempt.error).toMatch(/too many|request a new/i);
  });

  it("rejects a malformed code without touching the database", async () => {
    const { requestPhoneOtp, verifyPhoneOtp } = await import("@/lib/phone-otp");
    const phone = uniquePhone();

    await requestPhoneOtp(phone);
    const result = await verifyPhoneOtp(phone, "abc");
    expect(result.success).toBe(false);
  });
});

describe("findOrCreateUserForPhone (integration)", () => {
  it("creates a new lightweight account on first sign-in", async () => {
    const { findOrCreateUserForPhone } = await import("@/lib/phone-otp");
    const { db } = await import("@/lib/db");
    const phone = uniquePhone();

    const user = await findOrCreateUserForPhone(phone);
    expect(user.phone).toBe(phone);

    const stored = await db.user.findUnique({ where: { id: user.id } });
    expect(stored?.phoneVerifiedAt).not.toBeNull();
    expect(stored?.subscriptionTier).toBe("STANDARD");
  });

  it("reuses the same account on a second sign-in for the same phone", async () => {
    const { findOrCreateUserForPhone } = await import("@/lib/phone-otp");
    const phone = uniquePhone();

    const first = await findOrCreateUserForPhone(phone);
    const second = await findOrCreateUserForPhone(phone);
    expect(second.id).toBe(first.id);
  });
});
