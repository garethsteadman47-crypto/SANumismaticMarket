import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Integration test: exercises `createListing` against a *real* MongoDB
 * replica set (required for Prisma transactions), spun up on demand via
 * `mongodb-memory-server`. This is what actually proves:
 *
 *   - listing + verification + certificate lock are created atomically
 *   - the R15 verification fee is logged as PENDING, never charged upfront
 *   - the CertificateLock's unique index enforces the anti-fraud
 *     "one active listing per certificate" rule at the database level
 *
 * Kept out of the default `npm test` run (see vitest.config.mts) since it
 * downloads/starts a real `mongod` binary and is significantly slower than
 * the pure-function unit tests. Run explicitly with `npm run test:integration`.
 */

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri("sa_numismatic_marketplace_test");
  process.env.DATABASE_URL = uri;

  // Create the unique indexes the anti-fraud/uniqueness tests below rely on
  // directly via the driver (mirroring `prisma/schema.prisma`), instead of
  // shelling out to `prisma db push` — avoids spawning a CLI subprocess
  // (with its own npm/network checks) inside the test runner.
  const { db } = await import("@/lib/db");
  await db.$runCommandRaw({
    createIndexes: "CertificateLock",
    indexes: [{ key: { certificateId: 1 }, name: "CertificateLock_certificateId_key", unique: true }],
  });
  await db.$runCommandRaw({
    createIndexes: "User",
    indexes: [{ key: { email: 1 }, name: "User_email_key", unique: true }],
  });
  await db.$runCommandRaw({
    createIndexes: "Listing",
    indexes: [{ key: { slug: 1 }, name: "Listing_slug_key", unique: true }],
  });
}, 120_000);

afterAll(async () => {
  const { db } = await import("@/lib/db");
  await db.$disconnect();
  await replSet.stop();
});

describe("createListing (integration)", () => {
  it("creates a RAW listing without a verification or certificate lock", async () => {
    const { db } = await import("@/lib/db");
    const { createListing } = await import("@/lib/listings");

    const seller = await db.user.create({ data: { email: `raw-seller-${Date.now()}@example.com` } });

    const result = await createListing(seller.id, {
      title: "1926 SA Penny",
      description: "A well-circulated Union period penny.",
      category: "COINS",
      listingType: "RAW",
      priceCents: 5_000,
      images: ["https://example.com/penny.jpg"],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const listing = await db.listing.findUnique({ where: { id: result.listingId } });
    expect(listing?.status).toBe("ACTIVE");
    expect(listing?.certificateId).toBeNull();

    const verification = await db.verification.findUnique({ where: { listingId: result.listingId } });
    expect(verification).toBeNull();
  });

  it("creates a GRADED listing with a PENDING R15 verification fee and a certificate lock", async () => {
    const { db } = await import("@/lib/db");
    const { createListing } = await import("@/lib/listings");

    const seller = await db.user.create({ data: { email: `graded-seller-${Date.now()}@example.com` } });
    const certificateId = `NGC-INTEGRATION-${Date.now()}`;

    const result = await createListing(seller.id, {
      title: "1898 ZAR Single Pond",
      description: "Certified by NGC, exceptional strike.",
      category: "COINS",
      listingType: "GRADED",
      priceCents: 250_000,
      images: ["https://example.com/pond-front.jpg"],
      certificateId,
      verificationProvider: "NGC",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const verification = await db.verification.findUnique({ where: { listingId: result.listingId } });
    expect(verification).not.toBeNull();
    expect(verification?.feeCents).toBe(1500);
    expect(verification?.feeStatus).toBe("PENDING");
    expect(verification?.provider).toBe("NGC");

    const lock = await db.certificateLock.findUnique({ where: { certificateId } });
    expect(lock).not.toBeNull();
    expect(lock?.listingId).toBe(result.listingId);
  });

  it("enforces the anti-fraud lockout: a certificate cannot back two active listings", async () => {
    const { db } = await import("@/lib/db");
    const { createListing } = await import("@/lib/listings");

    const sellerA = await db.user.create({ data: { email: `lockout-a-${Date.now()}@example.com` } });
    const sellerB = await db.user.create({ data: { email: `lockout-b-${Date.now()}@example.com` } });
    const certificateId = `PCGS-LOCKOUT-${Date.now()}`;

    const first = await createListing(sellerA.id, {
      title: "1893 ZAR Double Shilling",
      description: "First listing for this certificate.",
      category: "COINS",
      listingType: "GRADED",
      priceCents: 180_000,
      images: ["https://example.com/shilling.jpg"],
      certificateId,
      verificationProvider: "PCGS",
    });
    expect(first.success).toBe(true);

    // Someone else (or a resubmission) tries to list the *same* certificate
    // while it's still active — this must be rejected, and it must not
    // create a second, dangling Listing/Verification row.
    const second = await createListing(sellerB.id, {
      title: "Stolen registry image attempt",
      description: "Attempting to relist an already-active certificate.",
      category: "COINS",
      listingType: "GRADED",
      priceCents: 999_00,
      images: ["https://example.com/fraud.jpg"],
      certificateId,
      verificationProvider: "PCGS",
    });

    expect(second.success).toBe(false);
    if (second.success) return;
    expect(second.field).toBe("certificateId");

    const locks = await db.certificateLock.findMany({ where: { certificateId } });
    expect(locks).toHaveLength(1);

    const listingsForCert = await db.listing.findMany({ where: { certificateId } });
    expect(listingsForCert).toHaveLength(1);
  });

  it("rejects a graded listing whose certificate ID fails basic validation", async () => {
    const { db } = await import("@/lib/db");
    const { createListing } = await import("@/lib/listings");

    const seller = await db.user.create({ data: { email: `notfound-${Date.now()}@example.com` } });

    // Certificate IDs shorter than 4 characters fail schema validation
    // before ever reaching the mock registry lookup.
    const result = await createListing(seller.id, {
      title: "Suspicious listing",
      description: "Certificate ID is too short to be real.",
      category: "COINS",
      listingType: "GRADED",
      priceCents: 10_000,
      images: ["https://example.com/x.jpg"],
      certificateId: "abc",
      verificationProvider: "SANGS",
    });

    expect(result.success).toBe(false);
  });
});
