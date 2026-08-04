import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Integration test: runs the `buildListingWhere` / `buildAuctionWhere`
 * output as *real* Prisma queries against a MongoDB replica set. The unit
 * tests in `browse-filters.test.ts` only assert on the shape of the where
 * clause; this file proves Mongo actually returns the right documents for
 * it — notably the `mode: "insensitive"` `contains`/`startsWith` filters,
 * which have real database-specific behavior worth verifying.
 */

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri("sa_numismatic_marketplace_browse_test");
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
  delete (globalThis as { __prisma?: unknown }).__prisma;
});

// Each test does a broad `findMany` (not scoped to IDs it just created), so
// leftover listings from an earlier test in this same file/replica-set
// would otherwise bleed into a later test's results.
beforeEach(async () => {
  const { db } = await import("@/lib/db");
  await db.verification.deleteMany({});
  await db.listing.deleteMany({});
  await db.user.deleteMany({});
});

let uniqueCounter = 0;
function unique(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueCounter}`;
}

async function makeSeller() {
  const { db } = await import("@/lib/db");
  return db.user.create({ data: { email: `${unique("seller")}@example.com` } });
}

interface ListingSeed {
  title: string;
  denomination?: string;
  category: "COINS" | "BANKNOTES" | "BULLION" | "KRUGERRAND" | "MEDALLIONS_TOKENS" | "ACCESSORIES" | "OTHER";
  listingType: "RAW" | "GRADED" | "BULLION";
  metal: "GOLD" | "SILVER" | "PLATINUM" | "PALLADIUM" | "COPPER" | "BRONZE" | "NICKEL" | "STEEL" | "OTHER" | "NOT_APPLICABLE";
  year?: number;
  priceCents: number;
  country?: string;
  acceptsOffers?: boolean;
  verification?: { provider: "SANGS" | "NGC" | "PCGS" | "ANACS" | "SA_MINT" | "HERNS"; grade: string };
}

async function makeListing(sellerId: string, seed: ListingSeed) {
  const { db } = await import("@/lib/db");
  const listing = await db.listing.create({
    data: {
      sellerId,
      slug: unique("listing"),
      title: seed.title,
      description: "Integration test listing.",
      category: seed.category,
      listingType: seed.listingType,
      metal: seed.metal,
      denomination: seed.denomination,
      year: seed.year,
      priceCents: seed.priceCents,
      country: seed.country ?? "South Africa",
      acceptsOffers: seed.acceptsOffers ?? true,
      images: ["https://example.com/photo.jpg"],
      status: "ACTIVE",
    },
  });

  if (seed.verification) {
    await db.verification.create({
      data: {
        listingId: listing.id,
        provider: seed.verification.provider,
        certificateId: unique("cert"),
        grade: seed.verification.grade,
        shieldAwarded: true,
      },
    });
  }

  return listing;
}

describe("buildListingWhere against a real database", () => {
  it("matches a taxonomy leaf by denomination keyword, case-insensitively", async () => {
    const { buildListingWhere, parseBrowseFilters } = await import("@/lib/browse-filters");
    const { db } = await import("@/lib/db");
    const seller = await makeSeller();

    const pond = await makeListing(seller.id, {
      title: "1898 ZAR Full Pond",
      denomination: "1 POND",
      category: "COINS",
      listingType: "RAW",
      metal: "GOLD",
      year: 1898,
      priceCents: 5_000_00,
    });
    await makeListing(seller.id, {
      title: "1898 ZAR Shilling",
      denomination: "1 Shilling",
      category: "COINS",
      listingType: "RAW",
      metal: "SILVER",
      year: 1898,
      priceCents: 500_00,
    });

    const where = buildListingWhere(parseBrowseFilters({ taxonomy: "zar-ponde" }))!;
    const results = await db.listing.findMany({ where });
    expect(results.map((r) => r.id)).toEqual([pond.id]);
  });

  it("matches grade brackets via case-insensitive startsWith on verification.grade", async () => {
    const { buildListingWhere, parseBrowseFilters } = await import("@/lib/browse-filters");
    const { db } = await import("@/lib/db");
    const seller = await makeSeller();

    const msGraded = await makeListing(seller.id, {
      title: "MS65 test coin",
      category: "COINS",
      listingType: "GRADED",
      metal: "SILVER",
      priceCents: 1_000_00,
      verification: { provider: "PCGS", grade: "ms65" }, // lowercase, on purpose
    });
    await makeListing(seller.id, {
      title: "AU58 test coin",
      category: "COINS",
      listingType: "GRADED",
      metal: "SILVER",
      priceCents: 1_000_00,
      verification: { provider: "PCGS", grade: "AU58" },
    });

    const where = buildListingWhere(parseBrowseFilters({ grade: "MS" }))!;
    const results = await db.listing.findMany({ where });
    expect(results.map((r) => r.id)).toEqual([msGraded.id]);
  });

  it("matches Ungraded/Raw via a missing verification relation", async () => {
    const { buildListingWhere, parseBrowseFilters } = await import("@/lib/browse-filters");
    const { db } = await import("@/lib/db");
    const seller = await makeSeller();

    const raw = await makeListing(seller.id, {
      title: "Raw uncertified coin",
      category: "COINS",
      listingType: "RAW",
      metal: "SILVER",
      priceCents: 500_00,
    });
    await makeListing(seller.id, {
      title: "Certified coin",
      category: "COINS",
      listingType: "GRADED",
      metal: "SILVER",
      priceCents: 500_00,
      verification: { provider: "NGC", grade: "MS64" },
    });

    const where = buildListingWhere(parseBrowseFilters({ cert: "RAW" }))!;
    const results = await db.listing.findMany({ where });
    expect(results.map((r) => r.id)).toEqual([raw.id]);
  });

  it("matches a metal bucket spanning multiple PreciousMetal enum values", async () => {
    const { buildListingWhere, parseBrowseFilters } = await import("@/lib/browse-filters");
    const { db } = await import("@/lib/db");
    const seller = await makeSeller();

    const copper = await makeListing(seller.id, {
      title: "Copper penny",
      category: "COINS",
      listingType: "RAW",
      metal: "COPPER",
      priceCents: 100_00,
    });
    const bronze = await makeListing(seller.id, {
      title: "Bronze medal",
      category: "MEDALLIONS_TOKENS",
      listingType: "RAW",
      metal: "BRONZE",
      priceCents: 100_00,
    });
    await makeListing(seller.id, {
      title: "Gold coin",
      category: "COINS",
      listingType: "RAW",
      metal: "GOLD",
      priceCents: 100_00,
    });

    const where = buildListingWhere(parseBrowseFilters({ metal: "COPPER_BRONZE" }))!;
    const results = await db.listing.findMany({ where });
    expect(new Set(results.map((r) => r.id))).toEqual(new Set([copper.id, bronze.id]));
  });

  it("applies year and price range filters together", async () => {
    const { buildListingWhere, parseBrowseFilters } = await import("@/lib/browse-filters");
    const { db } = await import("@/lib/db");
    const seller = await makeSeller();

    const inRange = await makeListing(seller.id, {
      title: "In range",
      category: "COINS",
      listingType: "RAW",
      metal: "SILVER",
      year: 1900,
      priceCents: 1_000_00,
    });
    await makeListing(seller.id, {
      title: "Wrong year",
      category: "COINS",
      listingType: "RAW",
      metal: "SILVER",
      year: 2000,
      priceCents: 1_000_00,
    });
    await makeListing(seller.id, {
      title: "Too expensive",
      category: "COINS",
      listingType: "RAW",
      metal: "SILVER",
      year: 1900,
      priceCents: 100_000_00,
    });

    const where = buildListingWhere(
      parseBrowseFilters({ minYear: "1874", maxYear: "1902", minPrice: "500", maxPrice: "5000" })
    )!;
    const results = await db.listing.findMany({ where });
    expect(results.map((r) => r.id)).toEqual([inRange.id]);
  });

  it("excludes listings entirely when Live Auctions is the only selected buying format", async () => {
    const { buildListingWhere, parseBrowseFilters } = await import("@/lib/browse-filters");
    expect(buildListingWhere(parseBrowseFilters({ format: "AUCTION" }))).toBeNull();
  });

  it("filters to acceptsOffers:true listings when only Accepting Offers is selected", async () => {
    const { buildListingWhere, parseBrowseFilters } = await import("@/lib/browse-filters");
    const { db } = await import("@/lib/db");
    const seller = await makeSeller();

    const offersOk = await makeListing(seller.id, {
      title: "Accepts offers",
      category: "COINS",
      listingType: "RAW",
      metal: "SILVER",
      priceCents: 100_00,
      acceptsOffers: true,
    });
    await makeListing(seller.id, {
      title: "No offers",
      category: "COINS",
      listingType: "RAW",
      metal: "SILVER",
      priceCents: 100_00,
      acceptsOffers: false,
    });

    const where = buildListingWhere(parseBrowseFilters({ format: "OFFERS" }))!;
    const results = await db.listing.findMany({ where });
    expect(results.map((r) => r.id)).toEqual([offersOk.id]);
  });

  it("matches the Global banknotes taxonomy via country != South Africa", async () => {
    const { buildListingWhere, parseBrowseFilters } = await import("@/lib/browse-filters");
    const { db } = await import("@/lib/db");
    const seller = await makeSeller();

    const german = await makeListing(seller.id, {
      title: "German Notgeld banknote",
      category: "BANKNOTES",
      listingType: "RAW",
      metal: "NOT_APPLICABLE",
      priceCents: 100_00,
      country: "Germany",
    });
    await makeListing(seller.id, {
      title: "SA banknote",
      category: "BANKNOTES",
      listingType: "RAW",
      metal: "NOT_APPLICABLE",
      priceCents: 100_00,
      country: "South Africa",
    });

    const where = buildListingWhere(parseBrowseFilters({ taxonomy: "banknotes" }))!;
    const results = await db.listing.findMany({ where });
    expect(results.map((r) => r.id)).toEqual([german.id]);
  });
});
