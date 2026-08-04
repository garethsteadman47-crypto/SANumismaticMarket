/**
 * Robust MongoDB seed for MintMark frontend browsing QA.
 *
 * Creates Standard / Silver / Gold demo users, ≥15 detailed listings spanning
 * the numismatic taxonomy, live auctions (with bid activity), and ad slots.
 * Idempotent via slug / title upserts.
 *
 * Requires DATABASE_URL pointing at a MongoDB replica set.
 *
 * Run: npm run db:seed
 */
import {
  ListingCategory,
  ListingType,
  PreciousMetal,
  PrismaClient,
  VerificationProvider,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_PASSWORD = "DemoPass123!";
const DEMO_USERS = {
  STANDARD: { email: "standard@demo.local", name: "Demo Standard User" },
  SILVER: { email: "silver@demo.local", name: "Demo Silver Trader" },
  GOLD: { email: "gold@demo.local", name: "Demo Gold Dealer" },
} as const;

type TierKey = keyof typeof DEMO_USERS;

function placeholderImage(seed: string, label: string): string {
  // Deterministic high-res placeholders suitable for Next.js Image remotePatterns.
  const encoded = encodeURIComponent(label.slice(0, 40));
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/800?label=${encoded}`;
}

function gallery(seed: string, label: string): string[] {
  return [
    placeholderImage(`${seed}-obverse`, `${label} — Obverse`),
    placeholderImage(`${seed}-reverse`, `${label} — Reverse`),
    placeholderImage(`${seed}-detail`, `${label} — Detail`),
  ];
}

/** Mock quarterly Hern / Minted chart series stored on Verification.rawApiResponse. */
function buildChartSeries(currentPriceCents: number, quarters = 12) {
  const startRatio = 0.48;
  const points: { date: string; realizedPriceCents: number; hernsIndexCents: number; mintageProxy: number }[] = [];
  for (let i = quarters; i >= 0; i--) {
    const progress = 1 - i / quarters;
    const realized = Math.round(currentPriceCents * (startRatio + (1 - startRatio) * progress));
    const herns = Math.round(realized * (0.92 + (progress % 0.07)));
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) - i;
    const date = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
    points.push({
      date,
      realizedPriceCents: realized,
      hernsIndexCents: herns,
      mintageProxy: Math.max(100, Math.round(50_000 * (1.2 - progress * 0.4))),
    });
  }
  points[points.length - 1].realizedPriceCents = currentPriceCents;
  return { source: "Minted.co.za × Hern's Handbook", points };
}

async function ensureUser(tier: TierKey) {
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

interface SeedListing {
  slug: string;
  title: string;
  description: string;
  category: ListingCategory;
  listingType: ListingType;
  metal: PreciousMetal;
  condition?: string;
  year?: number;
  country?: string;
  denomination?: string;
  priceCents: number;
  weightGrams?: number;
  purityPercent?: number;
  mintage?: number;
  acceptsOffers?: boolean;
  certificateId?: string;
  provider?: VerificationProvider;
  grade?: string;
  historicalNotes?: string;
}

async function upsertListing(sellerId: string, data: SeedListing) {
  const existing = await db.listing.findUnique({ where: { slug: data.slug } });
  if (existing) {
    console.log("Listing exists:", data.slug, existing.id);
    return existing;
  }

  const images = gallery(data.slug, data.title);
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
      country: data.country ?? "South Africa",
      denomination: data.denomination ?? null,
      priceCents: data.priceCents,
      weightGrams: data.weightGrams ?? null,
      purityPercent: data.purityPercent ?? null,
      mintage: data.mintage ?? null,
      acceptsOffers: data.acceptsOffers ?? true,
      images,
      status: "ACTIVE",
      certificateId: data.certificateId ?? null,
    },
  });

  if (data.certificateId && data.provider) {
    const chart = buildChartSeries(data.priceCents);
    await db.verification.create({
      data: {
        listingId: listing.id,
        provider: data.provider,
        certificateId: data.certificateId,
        grade: data.grade ?? data.condition ?? "MS65",
        mintage: data.mintage ?? 5_000,
        historicalNotes:
          data.historicalNotes ??
          "Seeded catalog notes for Hern vs. Mintage chart QA. Population and realized-price history are mock series.",
        rawApiResponse: chart,
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

async function upsertAd(opts: {
  slotType: "HOMEPAGE_HERO" | "CATEGORY_BANNER";
  category?: ListingCategory;
  slotPosition: number;
  listingId: string;
  advertiserId: string;
  targetUrl: string;
  imageSeed: string;
}) {
  const existing = await db.adPlacement.findFirst({
    where: {
      slotType: opts.slotType,
      category: opts.category ?? null,
      slotPosition: opts.slotPosition,
      isActive: true,
    },
  });
  if (existing) {
    console.log("Ad exists:", opts.slotType, opts.category ?? "-", opts.slotPosition);
    return existing;
  }

  const now = new Date();
  const ends = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ad = await db.adPlacement.create({
    data: {
      slotType: opts.slotType,
      category: opts.category ?? null,
      slotPosition: opts.slotPosition,
      listingId: opts.listingId,
      advertiserId: opts.advertiserId,
      imageUrl: placeholderImage(opts.imageSeed, "MintMark Featured"),
      targetUrl: opts.targetUrl,
      priceCents: 25000,
      startsAt: now,
      endsAt: ends,
      isActive: true,
    },
  });
  console.log("Created ad:", opts.slotType, opts.category ?? "-", opts.slotPosition);
  return ad;
}

interface SeedAuction {
  title: string;
  description: string;
  category: ListingCategory;
  metal?: PreciousMetal;
  startingPriceCents: number;
  bidIncrementCents?: number;
  startsAt: Date;
  endsAt: Date;
  status?: "LIVE" | "SCHEDULED";
  imageSeed: string;
}

async function upsertAuction(sellerId: string, data: SeedAuction) {
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
      images: gallery(data.imageSeed, data.title),
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
  const specs: [string, Record<string, number>, string, boolean][] = [
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
      const message = err instanceof Error ? err.message : String(err);
      console.log("Index skip:", name, message.slice(0, 80));
    }
  }
}

async function main() {
  const standard = await ensureUser("STANDARD");
  const silver = await ensureUser("SILVER");
  const gold = await ensureUser("GOLD");

  await ensureIndexes();

  // ── Featured examples from the brief ────────────────────────────────────
  const germanNotgeld = await upsertListing(standard.id, {
    slug: "1923-german-notgeld-50-million-mark",
    title: "1923 German Notgeld 50 Million Mark Note",
    description:
      "Hyperinflation-era German Notgeld note denominated at 50 Million Mark. Crisp paper with strong ink, serial clear, ideal for Vintage European banknote collectors. Fixed-price listing with detailed catalog notes for Hern vs. Mintage chart testing.",
    category: "BANKNOTES",
    listingType: "RAW",
    metal: "NOT_APPLICABLE",
    year: 1923,
    country: "Germany",
    denomination: "50 Million Mark Notgeld",
    priceCents: 18_500_00,
    historicalNotes: "Weimar emergency issue; comparable Notgeld realizations tracked quarterly.",
  });

  const cubanSpecimen = await upsertListing(silver.id, {
    slug: "1989-cuban-specimen-note",
    title: "1989 Cuban Specimen Note",
    description:
      "Official Banco Nacional de Cuba specimen banknote, 1989 series. SPECIMEN overprint, zeroed serials, hole-cancelled as issued. A cornerstone Global Specimen Notes reference piece.",
    category: "BANKNOTES",
    listingType: "GRADED",
    metal: "NOT_APPLICABLE",
    year: 1989,
    country: "Cuba",
    denomination: "Cuban Specimen Note",
    priceCents: 42_000_00,
    condition: "UNC",
    certificateId: "PMG-SEED-CUBA-1989-001",
    provider: "PCGS",
    grade: "UNC 66 EPQ",
    mintage: 2_500,
    historicalNotes: "Specimen overprint issue; PMG population scarce above UNC 65.",
  });

  const unionProofSet = await upsertListing(gold.id, {
    slug: "1952-sa-union-proof-set",
    title: "1952 SA Union Proof Set",
    description:
      "Complete 1952 South African Union proof set in original presentation. Includes Crown through Farthing. Make Offer enabled — sellers welcome serious collector bids from 70% of asking.",
    category: "COINS",
    listingType: "GRADED",
    metal: "SILVER",
    year: 1952,
    denomination: "Union Proof Set",
    priceCents: 185_000_00,
    condition: "Proof",
    acceptsOffers: true,
    certificateId: "SAMINT-SEED-PROOFSET-1952",
    provider: "SA_MINT",
    grade: "Proof Set",
    mintage: 3_500,
    purityPercent: 80,
    historicalNotes: "Union-era proof mintage; Hern catalog reference tracked against Minted realizations.",
  });

  // ── Additional taxonomy coverage (≥15 total listings) ───────────────────
  const listings = await Promise.all([
    upsertListing(gold.id, {
      slug: "1898-zar-full-pond-ngc",
      title: "1898 ZAR Full Pond — NGC AU58",
      description: "Classic Kruger-era gold Pond, NGC-certified About Uncirculated with attractive residual lustre.",
      category: "COINS",
      listingType: "GRADED",
      metal: "GOLD",
      year: 1898,
      denomination: "1 Pond",
      priceCents: 52_000_00,
      weightGrams: 7.988,
      purityPercent: 91.67,
      condition: "AU58",
      certificateId: "NGC-SEED-POND-1898",
      provider: "NGC",
      grade: "AU58",
      mintage: 136_870,
    }),
    upsertListing(gold.id, {
      slug: "1895-zar-half-ponde",
      title: "1895 ZAR Half Ponde — Raw",
      description: "Scarce Half Pond from the Zuid-Afrikaansche Republiek. Uncertified, honest VF surfaces.",
      category: "COINS",
      listingType: "RAW",
      metal: "GOLD",
      year: 1895,
      denomination: "Half Pond",
      priceCents: 28_500_00,
      weightGrams: 3.994,
      purityPercent: 91.67,
      condition: "VF",
      mintage: 34_000,
    }),
    upsertListing(standard.id, {
      slug: "1896-zar-shilling-anacs",
      title: "1896 ZAR Shilling — ANACS AU55",
      description: "Well-struck ZAR silver shilling with original toning. ANACS slabbed.",
      category: "COINS",
      listingType: "GRADED",
      metal: "SILVER",
      year: 1896,
      denomination: "1 Shilling",
      priceCents: 3_850_00,
      condition: "AU55",
      certificateId: "ANACS-SEED-SHILLING-1896",
      provider: "ANACS",
      grade: "AU55",
      mintage: 100_000,
    }),
    upsertListing(standard.id, {
      slug: "1942-union-penny-pcgs",
      title: "1942 Union Penny — PCGS VF25",
      description: "Bronze Union penny from the WWII years, PCGS Very Fine.",
      category: "COINS",
      listingType: "GRADED",
      metal: "BRONZE",
      year: 1942,
      denomination: "1 Penny",
      priceCents: 450_00,
      condition: "VF25",
      certificateId: "PCGS-SEED-PENNY-1942",
      provider: "PCGS",
      grade: "VF25",
      mintage: 21_000_000,
    }),
    upsertListing(silver.id, {
      slug: "1931-union-farthing",
      title: "1931 Union Farthing — XF40",
      description: "Scarce early Union farthing with sharp detail and even chocolate brown patina.",
      category: "COINS",
      listingType: "GRADED",
      metal: "BRONZE",
      year: 1931,
      denomination: "1 Farthing",
      priceCents: 1_250_00,
      condition: "XF40",
      certificateId: "SANGS-SEED-FARTHING-1931",
      provider: "SANGS",
      grade: "XF40",
      mintage: 505_000,
    }),
    upsertListing(gold.id, {
      slug: "2017-silver-krugerrand-ms69",
      title: "2017 Silver Krugerrand — NGC MS69",
      description:
        "Modern silver Krugerrand in near-perfect Mint State. Ideal Silver Krugerrands taxonomy + Hern chart listing.",
      category: "KRUGERRAND",
      listingType: "GRADED",
      metal: "SILVER",
      year: 2017,
      denomination: "1 oz Silver Krugerrand",
      priceCents: 1_450_00,
      weightGrams: 31.1,
      purityPercent: 99.9,
      condition: "MS69",
      certificateId: "NGC-SEED-SILVERKRUG-2017",
      provider: "NGC",
      grade: "MS69",
      mintage: 1_030_000,
    }),
    upsertListing(gold.id, {
      slug: "2000-r2-commemorative-silver",
      title: "2000 R2 Commemorative Silver Coin — NGC XF45",
      description: "Republic commemorative R2 silver issue, Extremely Fine, NGC certified.",
      category: "COINS",
      listingType: "GRADED",
      metal: "SILVER",
      year: 2000,
      denomination: "R2 Commemorative",
      priceCents: 680_00,
      purityPercent: 80,
      condition: "XF45",
      certificateId: "NGC-SEED-R2-2000",
      provider: "NGC",
      grade: "XF45",
      mintage: 45_000,
    }),
    upsertListing(silver.id, {
      slug: "fractional-1-10oz-gold-krugerrand",
      title: "1/10 oz Gold Krugerrand — Uncirculated",
      description: "Fractional bullion Krugerrand, brilliant uncirculated stock from a sealed tube.",
      category: "KRUGERRAND",
      listingType: "BULLION",
      metal: "GOLD",
      year: 2022,
      denomination: "1/10 oz Krugerrand",
      priceCents: 7_200_00,
      weightGrams: 3.11,
      purityPercent: 91.67,
      condition: "Uncirculated",
      mintage: 200_000,
    }),
    upsertListing(silver.id, {
      slug: "1oz-silver-mapungubwe-bu",
      title: "1oz Silver Mapungubwe — Brilliant Uncirculated",
      description: "Modern SA Mint bullion round, uncirculated stock suitable for melt-aware buyers.",
      category: "BULLION",
      listingType: "BULLION",
      metal: "SILVER",
      year: 2024,
      denomination: "1 oz Uncirculated",
      priceCents: 890_00,
      weightGrams: 31.1,
      purityPercent: 99.9,
      condition: "BU",
    }),
    upsertListing(gold.id, {
      slug: "2021-silver-leopard-proof-set",
      title: "2021 Silver Leopard Proof Set",
      description: "South African Mint Silver Leopard set — wildlife series highlight for Sets & Wildlife collectors.",
      category: "COINS",
      listingType: "GRADED",
      metal: "SILVER",
      year: 2021,
      denomination: "Silver Leopard Set",
      priceCents: 9_800_00,
      purityPercent: 99.9,
      condition: "Proof",
      certificateId: "SAMINT-SEED-LEOPARD-2021",
      provider: "SA_MINT",
      grade: "Proof Set",
      mintage: 1_000,
    }),
    upsertListing(standard.id, {
      slug: "off-center-strike-error-krugerrand",
      title: "Silver Krugerrand — Off-Center Strike Error",
      description: "Dramatic off-center strike error variety. Highly sought by error coin specialists.",
      category: "OTHER",
      listingType: "RAW",
      metal: "SILVER",
      year: 2018,
      denomination: "Strike Error",
      priceCents: 2_400_00,
      weightGrams: 31.1,
      purityPercent: 99.9,
      condition: "Error",
      mintage: 1,
    }),
    upsertListing(silver.id, {
      slug: "belarusian-specimen-10000-ruble",
      title: "2000 Belarusian Specimen 10,000 Ruble Note",
      description: "National Bank of Belarus specimen issue with SPECIMEN overprint — Global Specimen Notes coverage.",
      category: "BANKNOTES",
      listingType: "RAW",
      metal: "NOT_APPLICABLE",
      year: 2000,
      country: "Belarus",
      denomination: "Specimen Note",
      priceCents: 1_100_00,
      condition: "UNC",
    }),
    germanNotgeld,
    cubanSpecimen,
    unionProofSet,
  ]);

  // Fixed-price Krugerrand with offers disabled (Buy Now only facet).
  const noOffers = await db.listing.findUnique({ where: { slug: "1980-gold-krugerrand-fixed-only" } });
  if (!noOffers) {
    const created = await upsertListing(gold.id, {
      slug: "1980-gold-krugerrand-fixed-only",
      title: "1980 Gold Krugerrand — Fixed Price Only",
      description: "Seller has disabled offers — Buy Now only. Classic bullion Krugerrand.",
      category: "KRUGERRAND",
      listingType: "BULLION",
      metal: "GOLD",
      year: 1980,
      denomination: "1 oz Krugerrand",
      priceCents: 68_500_00,
      weightGrams: 33.93,
      purityPercent: 91.67,
      acceptsOffers: false,
    });
    await db.listing.update({ where: { id: created.id }, data: { acceptsOffers: false } });
  }

  const heroListing = listings.find((l) => l.slug === "1898-zar-full-pond-ngc") ?? listings[0];
  await upsertAd({
    slotType: "HOMEPAGE_HERO",
    slotPosition: 1,
    listingId: heroListing.id,
    advertiserId: gold.id,
    targetUrl: `/listings/${heroListing.id}`,
    imageSeed: "hero-pond",
  });
  await upsertAd({
    slotType: "HOMEPAGE_HERO",
    slotPosition: 2,
    listingId: unionProofSet.id,
    advertiserId: gold.id,
    targetUrl: `/listings/${unionProofSet.id}`,
    imageSeed: "hero-proofset",
  });
  await upsertAd({
    slotType: "CATEGORY_BANNER",
    category: "COINS",
    slotPosition: 1,
    listingId: cubanSpecimen.id,
    advertiserId: silver.id,
    targetUrl: `/listings/${cubanSpecimen.id}`,
    imageSeed: "banner-cuba",
  });

  const now = Date.now();

  // Example Item 2: Big Five Buffalo Double Coin Set — live auction, ends in 3 days.
  const buffaloAuction = await upsertAuction(gold.id, {
    title: "2023 Big Five Buffalo Double Coin Silver Set",
    description:
      "Complete 2023 Big Five Buffalo double coin silver set from the South African Mint. Live auction ending in three days — early Gold-member access already elapsed; public floor is open.",
    category: "COINS",
    metal: "SILVER",
    startingPriceCents: 12_000_00,
    bidIncrementCents: 25_000,
    startsAt: new Date(now - 6 * 60 * 60 * 1000),
    endsAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
    status: "LIVE",
    imageSeed: "auction-buffalo-2023",
  });

  // Example Item 4: 1967 Silver Krugerrand — live auction with high bid activity.
  const silverKrugAuction = await upsertAuction(gold.id, {
    title: "1967 Silver Krugerrand — Live Auction",
    description:
      "First-year silver Krugerrand concept piece / modern restrike presentation offered at auction with aggressive bidding. High bid activity seeded for UI stress-testing.",
    category: "KRUGERRAND",
    metal: "SILVER",
    startingPriceCents: 2_500_00,
    bidIncrementCents: 10_000,
    startsAt: new Date(now - 24 * 60 * 60 * 1000),
    endsAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
    status: "LIVE",
    imageSeed: "auction-silver-krug-1967",
  });

  // Seed escalating bids on the Silver Krugerrand auction (idempotent: only if none yet).
  const existingBids = await db.bid.count({ where: { auctionId: silverKrugAuction.id } });
  if (existingBids === 0) {
    const bidSteps = [2_500_00, 2_700_00, 3_000_00, 3_400_00, 3_900_00, 4_500_00, 5_200_00];
    const bidders = [standard, silver, standard, silver, standard, silver, standard];
    for (let i = 0; i < bidSteps.length; i++) {
      await db.bid.create({
        data: {
          auctionId: silverKrugAuction.id,
          bidderId: bidders[i].id,
          amountCents: bidSteps[i],
        },
      });
    }
    const top = bidSteps[bidSteps.length - 1];
    await db.auction.update({
      where: { id: silverKrugAuction.id },
      data: {
        currentBidCents: top,
        currentBidderId: standard.id,
        version: bidSteps.length,
      },
    });
    console.log("Seeded", bidSteps.length, "bids on", silverKrugAuction.title);
  }

  // A couple more auctions for browse density.
  await upsertAuction(silver.id, {
    title: "1898 ZAR Single 9 Pond — Live Auction",
    description: "Rare overdate variety Single 9 Pond, offered at auction with no reserve.",
    category: "COINS",
    metal: "GOLD",
    startingPriceCents: 150_000_00,
    bidIncrementCents: 50_000,
    startsAt: new Date(now - 60 * 60 * 1000),
    endsAt: new Date(now + 8 * 60 * 60 * 1000),
    status: "LIVE",
    imageSeed: "auction-single9",
  });

  await upsertAuction(silver.id, {
    title: "Vintage SA Proof Rand Trio — Upcoming",
    description: "Curated three-coin proof silver Rand set, opening soon.",
    category: "COINS",
    metal: "SILVER",
    startingPriceCents: 2_500_00,
    bidIncrementCents: 10_000,
    startsAt: new Date(now + 24 * 60 * 60 * 1000),
    endsAt: new Date(now + 4 * 24 * 60 * 60 * 1000),
    status: "SCHEDULED",
    imageSeed: "auction-proof-trio",
  });

  const listingCount = await db.listing.count({ where: { status: "ACTIVE" } });
  const auctionCount = await db.auction.count();

  console.log(
    JSON.stringify(
      {
        users: {
          standard: standard.email,
          silver: silver.email,
          gold: gold.email,
          password: DEMO_PASSWORD,
        },
        counts: { activeListings: listingCount, auctions: auctionCount },
        featured: {
          germanNotgeld: germanNotgeld.id,
          cubanSpecimen: cubanSpecimen.id,
          unionProofSet: unionProofSet.id,
          buffaloAuction: buffaloAuction.id,
          silverKrugAuction: silverKrugAuction.id,
        },
      },
      null,
      2
    )
  );
  console.log("SEED_DONE");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
