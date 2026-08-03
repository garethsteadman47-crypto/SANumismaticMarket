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

// Additional listings spanning the numismatic taxonomy + filter facets, so
// /listings has real content across categories, grades, metals, eras, and
// buying formats to click through.
const zarPond = await upsertListing(gold.id, {
  slug: "demo-1898-zar-full-pond",
  title: "1898 ZAR Full Pond — Uncertified",
  description: "Classic ZAR gold Pond from the Kruger era, raw/ungraded.",
  category: "COINS",
  listingType: "RAW",
  metal: "GOLD",
  year: 1898,
  denomination: "1 Pond",
  priceCents: 4_800_000,
});

const zarShilling = await upsertListing(standard.id, {
  slug: "demo-1895-zar-shilling",
  title: "1895 ZAR Shilling — ANACS AU55",
  description: "Well-preserved ZAR shilling, ANACS certified.",
  category: "COINS",
  listingType: "GRADED",
  metal: "SILVER",
  condition: "AU55",
  year: 1895,
  denomination: "1 Shilling",
  priceCents: 320_000,
  certificateId: "ANACS-DEMO-SHILLING-1895",
  provider: "ANACS",
});

const unionHalfCrown = await upsertListing(silver.id, {
  slug: "demo-1935-union-half-crown",
  title: "1935 Union Half Crown — SA Mint Proof",
  description: "Silver Half Crown from the Union period, SA Mint certified proof.",
  category: "COINS",
  listingType: "GRADED",
  metal: "SILVER",
  condition: "Proof",
  year: 1935,
  denomination: "Half Crown",
  priceCents: 280_000,
  certificateId: "SAMINT-DEMO-HALFCROWN-1935",
  provider: "SA_MINT",
});

const unionPenny = await upsertListing(standard.id, {
  slug: "demo-1942-union-penny",
  title: "1942 Union Penny — VF20",
  description: "Bronze Union penny, circulated Very Fine grade.",
  category: "COINS",
  listingType: "GRADED",
  metal: "BRONZE",
  condition: "VF20",
  year: 1942,
  denomination: "1 Penny",
  priceCents: 45_000,
  certificateId: "PCGS-DEMO-PENNY-1942",
  provider: "PCGS",
});

const republicCommemorative = await upsertListing(gold.id, {
  slug: "demo-2000-r2-commemorative-silver",
  title: "2000 R2 Commemorative Silver Coin — XF45",
  description: "Republic-era commemorative R2 silver coin, Extremely Fine.",
  category: "COINS",
  listingType: "GRADED",
  metal: "SILVER",
  condition: "XF45",
  year: 2000,
  denomination: "R2 Commemorative",
  priceCents: 65_000,
  certificateId: "NGC-DEMO-R2-2000",
  provider: "NGC",
});

const strikeError = await upsertListing(silver.id, {
  slug: "demo-strike-error-krugerrand",
  title: "Silver Krugerrand — Off-Center Strike Error",
  description: "A dramatic off-center strike error variety, highly sought by error collectors.",
  category: "OTHER",
  listingType: "RAW",
  metal: "SILVER",
  year: 2018,
  denomination: "Strike Error",
  priceCents: 180_000,
});

const germanNotgeld = await upsertListing(standard.id, {
  slug: "demo-german-notgeld-1921",
  title: "1921 German Notgeld Emergency Banknote",
  description: "Vintage European emergency currency (Notgeld) issued during the Weimar era.",
  category: "BANKNOTES",
  listingType: "RAW",
  metal: "NOT_APPLICABLE",
  year: 1921,
  priceCents: 25_000,
  country: "Germany",
});

// Listing with offers disabled, to exercise the "Accepting Offers" filter meaningfully.
const noOffersListing = await db.listing.findUnique({ where: { slug: "demo-no-offers-krugerrand" } });
if (!noOffersListing) {
  const created = await upsertListing(gold.id, {
    slug: "demo-no-offers-krugerrand",
    title: "1980 Gold Krugerrand — Fixed Price Only",
    description: "Seller has disabled offers on this Krugerrand — Buy Now only.",
    category: "KRUGERRAND",
    listingType: "BULLION",
    metal: "GOLD",
    year: 1980,
    denomination: "1 oz Krugerrand",
    priceCents: 6_900_000,
  });
  await db.listing.update({ where: { id: created.id }, data: { acceptsOffers: false } });
  console.log("Set acceptsOffers=false on:", created.id);
}

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
        zarPond: zarPond.id,
        zarShilling: zarShilling.id,
        unionHalfCrown: unionHalfCrown.id,
        unionPenny: unionPenny.id,
        republicCommemorative: republicCommemorative.id,
        strikeError: strikeError.id,
        germanNotgeld: germanNotgeld.id,
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
