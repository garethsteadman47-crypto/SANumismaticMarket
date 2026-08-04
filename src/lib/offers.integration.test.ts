import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Integration test: exercises the full "Make an Offer" negotiation flow in
 * `lib/offers.ts` against a real MongoDB replica set — mirrors
 * `lib/orders.integration.test.ts`. Run with `npm run test:integration`.
 */

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri("sa_numismatic_marketplace_offers_test");
  process.env.DATABASE_URL = uri;

  const { db } = await import("@/lib/db");
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
  // See the matching comment in `orders.integration.test.ts` — resets the
  // dev-mode singleton so a subsequent integration test file sharing this
  // worker thread doesn't reuse this file's (now-stopped) replica set.
  delete (globalThis as { __prisma?: unknown }).__prisma;
});

let uniqueCounter = 0;
function unique(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueCounter}`;
}

async function makeUser() {
  const { db } = await import("@/lib/db");
  return db.user.create({ data: { email: `${unique("user")}@example.com` } });
}

async function makeListing(sellerId: string, priceCents: number) {
  const { db } = await import("@/lib/db");
  return db.listing.create({
    data: {
      sellerId,
      slug: unique("listing"),
      title: "Test Listing",
      description: "A listing created for offer integration testing.",
      category: "COINS",
      listingType: "RAW",
      priceCents,
      images: ["https://example.com/photo.jpg"],
      status: "ACTIVE",
    },
  });
}

describe("createOffer (integration)", () => {
  it("rejects an offer below 70% of asking price", async () => {
    const { createOffer } = await import("@/lib/offers");
    const seller = await makeUser();
    const buyer = await makeUser();
    const listing = await makeListing(seller.id, 100_00);

    const result = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 69_99 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("70%");
  });

  it("accepts an offer at exactly 70% of asking price", async () => {
    const { createOffer } = await import("@/lib/offers");
    const seller = await makeUser();
    const buyer = await makeUser();
    const listing = await makeListing(seller.id, 100_00);

    const result = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 70_00 });
    expect(result.success).toBe(true);
  });

  it("rejects a seller making an offer on their own listing", async () => {
    const { createOffer } = await import("@/lib/offers");
    const seller = await makeUser();
    const listing = await makeListing(seller.id, 100_00);

    const result = await createOffer({ listingId: listing.id, buyerId: seller.id, offerAmountCents: 90_00 });
    expect(result.success).toBe(false);
  });

  it("rejects a second open offer from the same buyer on the same listing", async () => {
    const { createOffer } = await import("@/lib/offers");
    const seller = await makeUser();
    const buyer = await makeUser();
    const listing = await makeListing(seller.id, 100_00);

    const first = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 80_00 });
    expect(first.success).toBe(true);

    const second = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 85_00 });
    expect(second.success).toBe(false);
  });
});

describe("respondToOffer (integration)", () => {
  it("lets the seller accept an offer", async () => {
    const { createOffer, respondToOffer } = await import("@/lib/offers");
    const { db } = await import("@/lib/db");
    const seller = await makeUser();
    const buyer = await makeUser();
    const listing = await makeListing(seller.id, 100_00);

    const created = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 80_00 });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const responded = await respondToOffer({ offerId: created.offerId, sellerId: seller.id, action: "ACCEPT" });
    expect(responded.success).toBe(true);

    const offer = await db.offer.findUnique({ where: { id: created.offerId } });
    expect(offer?.status).toBe("ACCEPTED");
  });

  it("lets the seller counter within the valid range", async () => {
    const { createOffer, respondToOffer } = await import("@/lib/offers");
    const { db } = await import("@/lib/db");
    const seller = await makeUser();
    const buyer = await makeUser();
    const listing = await makeListing(seller.id, 100_00);

    const created = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 75_00 });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const responded = await respondToOffer({
      offerId: created.offerId,
      sellerId: seller.id,
      action: "COUNTER",
      counterAmountCents: 90_00,
    });
    expect(responded.success).toBe(true);

    const offer = await db.offer.findUnique({ where: { id: created.offerId } });
    expect(offer?.status).toBe("COUNTERED");
    expect(offer?.counterAmountCents).toBe(90_00);
  });

  it("rejects a counter amount at or above the asking price", async () => {
    const { createOffer, respondToOffer } = await import("@/lib/offers");
    const seller = await makeUser();
    const buyer = await makeUser();
    const listing = await makeListing(seller.id, 100_00);

    const created = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 75_00 });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const responded = await respondToOffer({
      offerId: created.offerId,
      sellerId: seller.id,
      action: "COUNTER",
      counterAmountCents: 100_00,
    });
    expect(responded.success).toBe(false);
  });

  it("rejects a response from someone who isn't the seller", async () => {
    const { createOffer, respondToOffer } = await import("@/lib/offers");
    const seller = await makeUser();
    const buyer = await makeUser();
    const stranger = await makeUser();
    const listing = await makeListing(seller.id, 100_00);

    const created = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 80_00 });
    expect(created.success).toBe(true);
    if (!created.success) return;

    const responded = await respondToOffer({ offerId: created.offerId, sellerId: stranger.id, action: "ACCEPT" });
    expect(responded.success).toBe(false);
  });
});

describe("respondToCounterOffer + checkout with an accepted offer (integration)", () => {
  it("lets the buyer accept a counter-offer, then checkout charges the negotiated price", async () => {
    const { createOffer, respondToOffer, respondToCounterOffer, getAcceptedOfferForBuyer, getAcceptedOfferPriceCents } =
      await import("@/lib/offers");
    const { createOrder } = await import("@/lib/orders");
    const { db } = await import("@/lib/db");

    const seller = await makeUser();
    const buyer = await makeUser();
    const listing = await makeListing(seller.id, 200_00);

    const created = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 150_00 });
    expect(created.success).toBe(true);
    if (!created.success) return;

    await respondToOffer({ offerId: created.offerId, sellerId: seller.id, action: "COUNTER", counterAmountCents: 180_00 });
    const buyerAccept = await respondToCounterOffer({ offerId: created.offerId, buyerId: buyer.id, action: "ACCEPT" });
    expect(buyerAccept.success).toBe(true);

    const acceptedOffer = await getAcceptedOfferForBuyer(listing.id, buyer.id);
    expect(acceptedOffer).not.toBeNull();
    if (!acceptedOffer) return;
    expect(getAcceptedOfferPriceCents(acceptedOffer)).toBe(180_00);

    const order = await createOrder({
      buyerId: buyer.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
      offerId: acceptedOffer.id,
    });
    expect(order.success).toBe(true);
    if (!order.success) return;

    const createdOrder = await db.order.findUnique({ where: { id: order.orderId } });
    expect(createdOrder?.itemPriceCents).toBe(180_00);
  });

  it("rejects an offerId at checkout that doesn't belong to this buyer", async () => {
    const { createOffer, respondToOffer } = await import("@/lib/offers");
    const { createOrder } = await import("@/lib/orders");

    const seller = await makeUser();
    const buyer = await makeUser();
    const impersonator = await makeUser();
    const listing = await makeListing(seller.id, 200_00);

    const created = await createOffer({ listingId: listing.id, buyerId: buyer.id, offerAmountCents: 150_00 });
    expect(created.success).toBe(true);
    if (!created.success) return;
    await respondToOffer({ offerId: created.offerId, sellerId: seller.id, action: "ACCEPT" });

    const order = await createOrder({
      buyerId: impersonator.id,
      listingId: listing.id,
      paymentProvider: "OZOW",
      offerId: created.offerId,
    });
    expect(order.success).toBe(false);
  });
});
