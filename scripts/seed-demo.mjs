/**
 * Demo seed for local / preview environments.
 *
 * Creates Standard / Silver / Gold demo users, a few ACTIVE listings, and
 * capped homepage/category ad placements. Safe to re-run (idempotent upserts).
 *
 * Requires DATABASE_URL pointing at a MongoDB replica set.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_PASSWORD = "DemoPass123!";
const DEMO_USERS = {
  STANDARD: { email: "standard@demo.local", name: "Demo Standard User" },
  SILVER: { email: "silver@demo.local", name: "Demo Silver Trader" },
  GOLD: { email: "gold@demo.local", name: "Demo Gold Dealer" },
};

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1c1917"/><stop offset="100%" stop-color="#44403c"/>
      </linearGradient></defs>
      <rect width="1200" height="800" fill="url(#g)"/>
      <circle cx="600" cy="360" r="140" fill="#d4af37" opacity="0.9"/>
      <text x="600" y="620" text-anchor="middle" fill="#fafaf9" font-family="Georgia,serif" font-size="42">SA Numismatic</text>
    </svg>`
  );

async function ensureUser(tier) {
  const { email, name } = DEMO_USERS[tier];
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await db.user.upsert({
    where: { email },
    update: { subscriptionTier: tier, passwordHash, name },
    create: { email, name, passwordHash, role: "USER", subscriptionTier: tier },
  });
  await db.subscription.upsert({
    where: { userId: user.id },
    update: { tier, status: "ACTIVE" },
    create: { userId: user.id, tier, status: "ACTIVE" },
  });
  return user;
}

async function upsertListing(sellerId, data) {
  const existing = await db.listing.findUnique({ where: { slug: data.slug } });
  if (existing) {
    console.log("Listing exists:", data.slug, existing.id);
    return existing;
  }

  const listing = await db.listing.create({
    data: {
      sellerId,
      slug: data.slug,
      title: data.title,
      description: data.description,
      category: data.category,
      listingType: data.listingType,
      metal: data.metal,
      condition: data.condition ?? null,
      year: data.year ?? null,
      denomination: data.denomination ?? null,
      priceCents: data.priceCents,
      weightGrams: data.weightGrams ?? null,
      purityPercent: data.purityPercent ?? null,
      images: [PLACEHOLDER],
      status: "ACTIVE",
      certificateId: data.certificateId ?? null,
    },
  });

  if (data.certificateId && data.provider) {
    await db.verification.create({
      data: {
        listingId: listing.id,
        provider: data.provider,
        certificateId: data.certificateId,
        grade: data.condition ?? "MS65",
        mintage: 5000,
        historicalNotes: "Seeded demo verification.",
        shieldAwarded: true,
        feeCents: 1500,
        feeStatus: "PENDING",
      },
    });
    await db.certificateLock.create({
      data: {
        certificateId: data.certificateId,
        provider: data.provider,
        listingId: listing.id,
      },
    });
  }

  console.log("Created listing:", data.slug, listing.id);
  return listing;
}

async function upsertAd({ slotType, category, slotPosition, listingId, advertiserId, targetUrl }) {
  const existing = await db.adPlacement.findFirst({
    where: { slotType, category: category ?? null, slotPosition, isActive: true },
  });
  if (existing) {
    console.log("Ad exists:", slotType, category ?? "-", slotPosition);
    return existing;
  }

  const now = new Date();
  const ends = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ad = await db.adPlacement.create({
    data: {
      slotType,
      category: category ?? null,
      slotPosition,
      listingId,
      advertiserId,
      imageUrl: PLACEHOLDER,
      targetUrl,
      priceCents: 25000,
      startsAt: now,
      endsAt: ends,
      isActive: true,
    },
  });
  console.log("Created ad:", slotType, category ?? "-", slotPosition);
  return ad;
}

async function upsertAuction(sellerId, data) {
  const existing = await db.auction.findFirst({ where: { title: data.title, sellerId } });
  if (existing) {
    console.log("Auction exists:", data.title, existing.id);
    return existing;
  }
  const auction = await db.auction.create({
    data: {
      sellerId,
      title: data.title,
      description: data.description,
      images: [PLACEHOLDER],
      category: data.category,
      metal: data.metal ?? "NOT_APPLICABLE",
      startingPriceCents: data.startingPriceCents,
      bidIncrementCents: data.bidIncrementCents ?? 5000,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      status: data.status ?? "LIVE",
    },
  });
  console.log("Created auction:", data.title, auction.id);
  return auction;
}

async function ensureIndexes() {
  const specs = [
    ["CertificateLock", { certificateId: 1 }, "CertificateLock_certificateId_key", true],
    ["CertificateLock", { listingId: 1 }, "CertificateLock_listingId_key", true],
    ["User", { email: 1 }, "User_email_key", true],
    ["Listing", { slug: 1 }, "Listing_slug_key", true],
    ["Verification", { listingId: 1 }, "Verification_listingId_key", true],
    ["Subscription", { userId: 1 }, "Subscription_userId_key", true],
    ["Session", { sessionToken: 1 }, "Session_sessionToken_key", true],
    ["Invoice", { invoiceNumber: 1 }, "Invoice_invoiceNumber_key", true],
  ];

  for (const [collection, key, name, unique] of specs) {
    try {
      await db.$runCommandRaw({
        createIndexes: collection,
        indexes: [{ key, name, unique }],
      });
      console.log("Index ok:", name);
    } catch (err) {
      // Already exists / equivalent index — fine for idempotent seeding.
      console.log("Index skip:", name, err?.message?.slice?.(0, 80) ?? err);
    }
  }
}

const standard = await ensureUser("STANDARD");
const silver = await ensureUser("SILVER");
const gold = await ensureUser("GOLD");

await ensureIndexes();

const goldKrug = await upsertListing(gold.id, {
  slug: "demo-1974-proof-krugerrand-gold",
  title: "1974 Proof Krugerrand — NGC PF69",
  description:
    "Museum-grade 1974 Proof Krugerrand slabbed by NGC. Ideal escrow walkthrough listing for Gold-tier instant settlement.",
  category: "KRUGERRAND",
  listingType: "GRADED",
  metal: "GOLD",
  condition: "PF69",
  year: 1974,
  denomination: "1 oz Krugerrand",
  priceCents: 6850000,
  certificateId: "NGC-DEMO-KRUG-1974-001",
  provider: "NGC",
});

const standardCoin = await upsertListing(standard.id, {
  slug: "demo-1967-rsa-silver-rand-standard",
  title: "1967 RSA Silver Rand — SANGS AU58",
  description:
    "Attractive 1967 silver rand for Standard-tier 48-hour hold walkthrough. Buyer pays under R5,000 so card is available.",
  category: "COINS",
  listingType: "GRADED",
  metal: "SILVER",
  condition: "AU58",
  year: 1967,
  denomination: "1 Rand",
  priceCents: 425000,
  certificateId: "SANGS-DEMO-RAND-1967-001",
  provider: "SANGS",
});

const silverBullion = await upsertListing(silver.id, {
  slug: "demo-1oz-silver-mapungubwe",
  title: "1oz Silver Mapungubwe Bullion Round",
  description: "Modern bullion round for category browsing and Silver-tier seller flows.",
  category: "BULLION",
  listingType: "BULLION",
  metal: "SILVER",
  year: 2024,
  denomination: "1 oz",
  priceCents: 89000,
  weightGrams: 31.1,
  purityPercent: 99.9,
});

await upsertAd({
  slotType: "HOMEPAGE_HERO",
  slotPosition: 1,
  listingId: goldKrug.id,
  advertiserId: gold.id,
  targetUrl: `/listings/${goldKrug.id}`,
});
await upsertAd({
  slotType: "HOMEPAGE_HERO",
  slotPosition: 2,
  listingId: standardCoin.id,
  advertiserId: standard.id,
  targetUrl: `/listings/${standardCoin.id}`,
});
await upsertAd({
  slotType: "CATEGORY_BANNER",
  category: "COINS",
  slotPosition: 1,
  listingId: standardCoin.id,
  advertiserId: standard.id,
  targetUrl: `/listings/${standardCoin.id}`,
});

const now = Date.now();
const liveAuction = await upsertAuction(gold.id, {
  title: "1898 ZAR 'Single 9' Pond — Live Auction",
  description: "Rare overdate variety Single 9 Pond, offered at auction with no reserve.",
  category: "COINS",
  metal: "GOLD",
  startingPriceCents: 15_000_00,
  bidIncrementCents: 50_000,
  startsAt: new Date(now - 60 * 60 * 1000),
  endsAt: new Date(now + 2 * 60 * 60 * 1000),
  status: "LIVE",
});
const upcomingAuction = await upsertAuction(silver.id, {
  title: "Set of 3 Silver Proof Rands — Upcoming Auction",
  description: "A curated 3-coin proof silver Rand set, opening soon.",
  category: "COINS",
  metal: "SILVER",
  startingPriceCents: 2_500_00,
  bidIncrementCents: 10_000,
  startsAt: new Date(now + 24 * 60 * 60 * 1000),
  endsAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
  status: "SCHEDULED",
});

console.log(
  JSON.stringify(
    {
      users: {
        standard: standard.email,
        silver: silver.email,
        gold: gold.email,
        password: DEMO_PASSWORD,
      },
      listings: {
        goldKrug: goldKrug.id,
        standardCoin: standardCoin.id,
        silverBullion: silverBullion.id,
      },
      auctions: {
        live: liveAuction.id,
        upcoming: upcomingAuction.id,
      },
    },
    null,
    2
  )
);
console.log("SEED_DONE");
await db.$disconnect();
