import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Integration test: exercises the live-auction bidding flow in
 * `lib/auctions.ts` against a real MongoDB replica set (required for the
 * transactional bid-claim in `placeBid`). Run with `npm run test:integration`.
 */

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri("sa_numismatic_marketplace_auctions_test");
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

async function makeAuction(sellerId: string, opts?: Partial<{ startingPriceCents: number; bidIncrementCents: number; startsAt: Date; endsAt: Date }>) {
  const { db } = await import("@/lib/db");
  const now = Date.now();
  return db.auction.create({
    data: {
      sellerId,
      title: "Test Auction Lot",
      description: "An auction created for integration testing.",
      images: ["https://example.com/lot.jpg"],
      category: "COINS",
      startingPriceCents: opts?.startingPriceCents ?? 1_000_00,
      bidIncrementCents: opts?.bidIncrementCents ?? 50_00,
      startsAt: opts?.startsAt ?? new Date(now - 60_000),
      endsAt: opts?.endsAt ?? new Date(now + 60 * 60 * 1000),
      status: "LIVE",
    },
  });
}

describe("placeBid (integration)", () => {
  it("accepts a bid at exactly the starting price when there's no bid yet", async () => {
    const { placeBid } = await import("@/lib/auctions");
    const { db } = await import("@/lib/db");
    const seller = await makeUser();
    const bidder = await makeUser();
    const auction = await makeAuction(seller.id, { startingPriceCents: 1_000_00 });

    const result = await placeBid({ auctionId: auction.id, bidderId: bidder.id, amountCents: 1_000_00 });
    expect(result.success).toBe(true);

    const updated = await db.auction.findUnique({ where: { id: auction.id } });
    expect(updated?.currentBidCents).toBe(1_000_00);
    expect(updated?.currentBidderId).toBe(bidder.id);
  });

  it("rejects a bid below the starting price", async () => {
    const { placeBid } = await import("@/lib/auctions");
    const seller = await makeUser();
    const bidder = await makeUser();
    const auction = await makeAuction(seller.id, { startingPriceCents: 1_000_00 });

    const result = await placeBid({ auctionId: auction.id, bidderId: bidder.id, amountCents: 900_00 });
    expect(result.success).toBe(false);
  });

  it("requires a subsequent bid to meet current bid + increment", async () => {
    const { placeBid } = await import("@/lib/auctions");
    const seller = await makeUser();
    const bidderA = await makeUser();
    const bidderB = await makeUser();
    const auction = await makeAuction(seller.id, { startingPriceCents: 1_000_00, bidIncrementCents: 50_00 });

    await placeBid({ auctionId: auction.id, bidderId: bidderA.id, amountCents: 1_000_00 });

    const tooLow = await placeBid({ auctionId: auction.id, bidderId: bidderB.id, amountCents: 1_020_00 });
    expect(tooLow.success).toBe(false);

    const valid = await placeBid({ auctionId: auction.id, bidderId: bidderB.id, amountCents: 1_050_00 });
    expect(valid.success).toBe(true);
  });

  it("rejects the seller bidding on their own auction", async () => {
    const { placeBid } = await import("@/lib/auctions");
    const seller = await makeUser();
    const auction = await makeAuction(seller.id);

    const result = await placeBid({ auctionId: auction.id, bidderId: seller.id, amountCents: 1_000_00 });
    expect(result.success).toBe(false);
  });

  it("rejects bids once the auction has ended", async () => {
    const { placeBid } = await import("@/lib/auctions");
    const seller = await makeUser();
    const bidder = await makeUser();
    const now = Date.now();
    const auction = await makeAuction(seller.id, {
      startsAt: new Date(now - 2 * 60 * 60 * 1000),
      endsAt: new Date(now - 60 * 1000),
    });

    const result = await placeBid({ auctionId: auction.id, bidderId: bidder.id, amountCents: 1_000_00 });
    expect(result.success).toBe(false);
  });

  it("records a Bid row for every successful bid", async () => {
    const { placeBid } = await import("@/lib/auctions");
    const { db } = await import("@/lib/db");
    const seller = await makeUser();
    const bidderA = await makeUser();
    const bidderB = await makeUser();
    const auction = await makeAuction(seller.id, { startingPriceCents: 1_000_00, bidIncrementCents: 50_00 });

    await placeBid({ auctionId: auction.id, bidderId: bidderA.id, amountCents: 1_000_00 });
    await placeBid({ auctionId: auction.id, bidderId: bidderB.id, amountCents: 1_050_00 });

    const bids = await db.bid.findMany({ where: { auctionId: auction.id } });
    expect(bids).toHaveLength(2);
  });
});
