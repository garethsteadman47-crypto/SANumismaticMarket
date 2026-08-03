import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Integration test: exercises the full order/escrow lifecycle in
 * `lib/orders.ts` against a *real* MongoDB replica set (required for
 * Prisma transactions), spun up on demand via `mongodb-memory-server` —
 * mirrors `lib/listings.integration.test.ts`. Run explicitly with
 * `npm run test:integration` (excluded from the default `npm test`).
 */

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri("sa_numismatic_marketplace_orders_test");
  process.env.DATABASE_URL = uri;

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

let uniqueCounter = 0;
function unique(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueCounter}`;
}

async function makeUser(tier: "STANDARD" | "SILVER" | "GOLD") {
  const { db } = await import("@/lib/db");
  return db.user.create({ data: { email: `${unique("user")}@example.com`, subscriptionTier: tier } });
}

async function makeListing(sellerId: string, priceCents: number, opts?: { certificateId?: string }) {
  const { db } = await import("@/lib/db");
  const listing = await db.listing.create({
    data: {
      sellerId,
      slug: unique("listing"),
      title: "Test Listing",
      description: "A listing created for integration testing.",
      category: "COINS",
      listingType: opts?.certificateId ? "GRADED" : "RAW",
      priceCents,
      images: ["https://example.com/photo.jpg"],
      status: "ACTIVE",
      certificateId: opts?.certificateId ?? null,
    },
  });

  if (opts?.certificateId) {
    await db.verification.create({
      data: {
        listingId: listing.id,
        provider: "NGC",
        certificateId: opts.certificateId,
        grade: "MS65",
        shieldAwarded: true,
        feeCents: 1500,
        feeStatus: "PENDING",
      },
    });
    await db.certificateLock.create({
      data: { certificateId: opts.certificateId, provider: "NGC", listingId: listing.id },
    });
  }

  return listing;
}

describe("createOrder", () => {
  it("creates an order in PAID_ESCROW, generates a delivery OTP, and locks the listing", async () => {
    const { db } = await import("@/lib/db");
    const { createOrder } = await import("@/lib/orders");

    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 10_000_00); // R10,000 (Tier 1)

    const result = await createOrder({ buyerId: buyer.id, listingId: listing.id, paymentProvider: "OZOW" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const order = await db.order.findUniqueOrThrow({ where: { id: result.orderId } });
    expect(order.status).toBe("PAID_ESCROW");
    expect(order.buyerId).toBe(buyer.id);
    expect(order.sellerId).toBe(seller.id);
    expect(order.itemPriceCents).toBe(1_000_000);
    expect(order.commissionRateBps).toBe(750); // Standard, Tier 1
    expect(order.deliveryOtp?.code).toMatch(/^\d{6}$/);
    expect(order.deliveryOtp?.attemptCount).toBe(0);

    const updatedListing = await db.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(updatedListing.status).toBe("PENDING_SALE");
  });

  it("rejects buying your own listing", async () => {
    const { createOrder } = await import("@/lib/orders");
    const seller = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 5_000_00);

    const result = await createOrder({ buyerId: seller.id, listingId: listing.id, paymentProvider: "OZOW" });
    expect(result.success).toBe(false);
  });

  it("rejects card payments for orders at or above R5,000", async () => {
    const { createOrder } = await import("@/lib/orders");
    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 5_000_00);

    const result = await createOrder({ buyerId: buyer.id, listingId: listing.id, paymentProvider: "CARD" });
    expect(result.success).toBe(false);
  });

  it("prevents two buyers from both successfully checking out the same listing", async () => {
    const { db } = await import("@/lib/db");
    const { createOrder } = await import("@/lib/orders");

    const seller = await makeUser("STANDARD");
    const buyerA = await makeUser("STANDARD");
    const buyerB = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 5_000_00);

    const [resultA, resultB] = await Promise.all([
      createOrder({ buyerId: buyerA.id, listingId: listing.id, paymentProvider: "OZOW" }),
      createOrder({ buyerId: buyerB.id, listingId: listing.id, paymentProvider: "OZOW" }),
    ]);

    const successes = [resultA, resultB].filter((r) => r.success);
    expect(successes).toHaveLength(1);

    const orders = await db.order.findMany({ where: { listingId: listing.id } });
    expect(orders).toHaveLength(1);
  });
});

describe("markOrderInTransit", () => {
  it("transitions PAID_ESCROW -> IN_TRANSIT and records the tracking number", async () => {
    const { db } = await import("@/lib/db");
    const { createOrder, markOrderInTransit } = await import("@/lib/orders");

    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 3_000_00);
    const { orderId } = (await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };

    const result = await markOrderInTransit({
      orderId,
      sellerId: seller.id,
      trackingNumber: "TRACK-123",
      packingVideoUrl: "https://example.com/packing.mp4",
    });
    expect(result.success).toBe(true);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("IN_TRANSIT");
    expect(order.trackingNumber).toBe("TRACK-123");
    expect(order.unboxingEvidence?.sellerPackingVideoUrl).toBe("https://example.com/packing.mp4");
  });

  it("rejects a non-seller trying to mark the order as shipped", async () => {
    const { createOrder, markOrderInTransit } = await import("@/lib/orders");
    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 3_000_00);
    const { orderId } = (await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };

    const result = await markOrderInTransit({ orderId, sellerId: buyer.id, trackingNumber: "X" });
    expect(result.success).toBe(false);
  });
});

describe("verifyDeliveryOtp", () => {
  async function shipOrder(sellerId: string, buyerId: string, listingId: string) {
    const { createOrder, markOrderInTransit } = await import("@/lib/orders");
    const { orderId } = (await createOrder({
      buyerId,
      listingId,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };
    await markOrderInTransit({ orderId, sellerId, trackingNumber: "TRACK-1" });
    const { db } = await import("@/lib/db");
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    return { orderId, code: order.deliveryOtp!.code };
  }

  it("rejects an incorrect code and increments the attempt count without changing status", async () => {
    const { db } = await import("@/lib/db");
    const { verifyDeliveryOtp } = await import("@/lib/orders");

    const seller = await makeUser("GOLD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 2_000_00);
    const { orderId } = await shipOrder(seller.id, buyer.id, listing.id);

    const result = await verifyDeliveryOtp({ orderId, actingUserId: buyer.id, submittedCode: "000000" });
    expect(result.success).toBe(false);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("IN_TRANSIT");
    expect(order.deliveryOtp?.attemptCount).toBe(1);
  });

  it("settles instantly for a Gold Dealer seller, releases the certificate lock, and generates both invoices", async () => {
    const { db } = await import("@/lib/db");
    const { verifyDeliveryOtp } = await import("@/lib/orders");

    const seller = await makeUser("GOLD");
    const buyer = await makeUser("STANDARD");
    const certificateId = unique("NGC-CERT");
    const listing = await makeListing(seller.id, 20_000_00, { certificateId }); // R20,000, Tier 2 -> Gold 3%
    const { orderId, code } = await shipOrder(seller.id, buyer.id, listing.id);

    const result = await verifyDeliveryOtp({ orderId, actingUserId: buyer.id, submittedCode: code });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.settled).toBe(true);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { invoices: true } });
    expect(order.status).toBe("SETTLED");
    expect(order.payoutVelocity).toBe("INSTANT");
    expect(order.settledAt).not.toBeNull();
    expect(order.invoices).toHaveLength(2);

    const sellerToBuyer = order.invoices.find((inv) => inv.type === "SELLER_TO_BUYER");
    const platformToSeller = order.invoices.find((inv) => inv.type === "PLATFORM_TO_SELLER");
    expect(sellerToBuyer?.totalCents).toBe(2_000_000);
    expect(platformToSeller?.totalCents).toBe(
      order.commissionAmountCents + order.verificationFeeCents + order.adBoostFeeCents + order.platformVatCents
    );

    const updatedListing = await db.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(updatedListing.status).toBe("SOLD");

    // The certificate lock must be released so the (new) owner can
    // legitimately relist the same physical item in the future.
    const lock = await db.certificateLock.findUnique({ where: { certificateId } });
    expect(lock).toBeNull();
  });

  it("moves to HOLD_48H (not SETTLED) for a Standard seller", async () => {
    const { db } = await import("@/lib/db");
    const { verifyDeliveryOtp } = await import("@/lib/orders");

    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 5_000_00);
    const { orderId, code } = await shipOrder(seller.id, buyer.id, listing.id);

    const result = await verifyDeliveryOtp({ orderId, actingUserId: buyer.id, submittedCode: code });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.settled).toBe(false);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { invoices: true } });
    expect(order.status).toBe("HOLD_48H");
    expect(order.payoutVelocity).toBe("HOLD_48H");
    expect(order.escrowHoldReleaseAt).not.toBeNull();
    expect(order.invoices).toHaveLength(0);

    const updatedListing = await db.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(updatedListing.status).toBe("PENDING_SALE"); // not SOLD yet — still on hold
  });
});

describe("settleExpiredHold / settleAllExpiredHolds", () => {
  async function createHeldOrder(tier: "STANDARD" | "SILVER") {
    const { db } = await import("@/lib/db");
    const { verifyDeliveryOtp } = await import("@/lib/orders");
    const { createOrder, markOrderInTransit } = await import("@/lib/orders");

    const seller = await makeUser(tier);
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 5_000_00);
    const { orderId } = (await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };
    await markOrderInTransit({ orderId, sellerId: seller.id, trackingNumber: "T" });
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await verifyDeliveryOtp({ orderId, actingUserId: buyer.id, submittedCode: order.deliveryOtp!.code });
    return { orderId, listingId: listing.id, buyerId: buyer.id, sellerId: seller.id };
  }

  it("refuses to settle a hold that hasn't expired yet", async () => {
    const { settleExpiredHold } = await import("@/lib/orders");
    const { orderId } = await createHeldOrder("STANDARD");

    const result = await settleExpiredHold(orderId);
    expect(result.success).toBe(false);
  });

  it("settles a hold once its release time has passed", async () => {
    const { db } = await import("@/lib/db");
    const { settleExpiredHold } = await import("@/lib/orders");
    const { orderId } = await createHeldOrder("STANDARD");

    await db.order.update({ where: { id: orderId }, data: { escrowHoldReleaseAt: new Date(Date.now() - 1000) } });

    const result = await settleExpiredHold(orderId);
    expect(result.success).toBe(true);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { invoices: true } });
    expect(order.status).toBe("SETTLED");
    expect(order.invoices).toHaveLength(2);
  });

  it("never settles a disputed order, even past its release time", async () => {
    const { db } = await import("@/lib/db");
    const { openDispute, settleExpiredHold } = await import("@/lib/orders");
    const { orderId, buyerId } = await createHeldOrder("SILVER");

    await openDispute(orderId, buyerId, "Item arrived damaged.");
    await db.order.update({ where: { id: orderId }, data: { escrowHoldReleaseAt: new Date(Date.now() - 1000) } });

    const result = await settleExpiredHold(orderId);
    expect(result.success).toBe(false);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("DISPUTE");
  });

  it("settleAllExpiredHolds settles every due order and skips disputed ones", async () => {
    const { db } = await import("@/lib/db");
    const { openDispute, settleAllExpiredHolds } = await import("@/lib/orders");

    const due = await createHeldOrder("STANDARD");
    const disputed = await createHeldOrder("SILVER");
    const notYetDue = await createHeldOrder("STANDARD");

    await db.order.update({ where: { id: due.orderId }, data: { escrowHoldReleaseAt: new Date(Date.now() - 1000) } });
    await openDispute(disputed.orderId, disputed.buyerId, "Not as described.");
    await db.order.update({
      where: { id: disputed.orderId },
      data: { escrowHoldReleaseAt: new Date(Date.now() - 1000) },
    });
    // notYetDue keeps its future escrowHoldReleaseAt from createHeldOrder.

    const { settledOrderIds } = await settleAllExpiredHolds();

    expect(settledOrderIds).toContain(due.orderId);
    expect(settledOrderIds).not.toContain(disputed.orderId);
    expect(settledOrderIds).not.toContain(notYetDue.orderId);
  });
});

describe("openDispute", () => {
  it("only allows opening a dispute during the HOLD_48H window", async () => {
    const { db } = await import("@/lib/db");
    const { createOrder, openDispute } = await import("@/lib/orders");

    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 3_000_00);
    const { orderId } = (await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };

    // Still PAID_ESCROW — too early to dispute.
    const tooEarly = await openDispute(orderId, buyer.id, "Changed my mind.");
    expect(tooEarly.success).toBe(false);

    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PAID_ESCROW");
  });

  it("rejects a dispute from someone who isn't the buyer or seller", async () => {
    const { db } = await import("@/lib/db");
    const { createOrder, markOrderInTransit, verifyDeliveryOtp, openDispute } = await import("@/lib/orders");

    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const stranger = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 3_000_00);
    const { orderId } = (await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };
    await markOrderInTransit({ orderId, sellerId: seller.id, trackingNumber: "T" });
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await verifyDeliveryOtp({ orderId, actingUserId: buyer.id, submittedCode: order.deliveryOtp!.code });

    const result = await openDispute(orderId, stranger.id, "Not my order.");
    expect(result.success).toBe(false);
  });
});

describe("uploadUnboxingVideo", () => {
  it("rejects an upload before delivery is confirmed", async () => {
    const { createOrder, uploadUnboxingVideo } = await import("@/lib/orders");
    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 3_000_00);
    const { orderId } = (await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };

    const result = await uploadUnboxingVideo(orderId, buyer.id, "https://example.com/video.mp4");
    expect(result.success).toBe(false);
  });

  it("allows the buyer to upload once the order reaches HOLD_48H", async () => {
    const { db } = await import("@/lib/db");
    const { createOrder, markOrderInTransit, verifyDeliveryOtp, uploadUnboxingVideo } = await import("@/lib/orders");

    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 3_000_00);
    const { orderId } = (await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };
    await markOrderInTransit({ orderId, sellerId: seller.id, trackingNumber: "T" });
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await verifyDeliveryOtp({ orderId, actingUserId: buyer.id, submittedCode: order.deliveryOtp!.code });

    const result = await uploadUnboxingVideo(orderId, buyer.id, "https://example.com/video.mp4");
    expect(result.success).toBe(true);

    const updated = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(updated.unboxingEvidence?.buyerUnboxingVideoUrl).toBe("https://example.com/video.mp4");
  });

  it("rejects an upload from someone other than the buyer", async () => {
    const { db } = await import("@/lib/db");
    const { createOrder, markOrderInTransit, verifyDeliveryOtp, uploadUnboxingVideo } = await import("@/lib/orders");

    const seller = await makeUser("STANDARD");
    const buyer = await makeUser("STANDARD");
    const listing = await makeListing(seller.id, 3_000_00);
    const { orderId } = (await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
    })) as { success: true; orderId: string };
    await markOrderInTransit({ orderId, sellerId: seller.id, trackingNumber: "T" });
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await verifyDeliveryOtp({ orderId, actingUserId: buyer.id, submittedCode: order.deliveryOtp!.code });

    const result = await uploadUnboxingVideo(orderId, seller.id, "https://example.com/video.mp4");
    expect(result.success).toBe(false);
  });
});
