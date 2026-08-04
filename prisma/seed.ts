/**
 * MintMark demo seed — clears marketplace inventory, then inserts curated
 * high-value listings/auctions with high-res Unsplash photography.
 *
 * Requires DATABASE_URL pointing at a MongoDB replica set.
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
  DEALER: { email: "dealer@demo.local", name: "Bassani Numismatics" },
} as const;

type TierKey = keyof typeof DEMO_USERS;

const IMAGES = {
  veldpond: "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=1200&q=80",
  silverKrug: "https://images.unsplash.com/photo-1605177991950-8de6fbd238ac?auto=format&fit=crop&w=1200&q=80",
  farthing: "https://images.unsplash.com/photo-1605335805561-12c8a245585f?auto=format&fit=crop&w=1200&q=80",
  buffalo: "https://images.unsplash.com/photo-1599557997972-00ab56bc7404?auto=format&fit=crop&w=1200&q=80",
  cuba: "https://images.unsplash.com/photo-1628156172608-8e6f1a8e19e7?auto=format&fit=crop&w=1200&q=80",
} as const;

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

async function clearMarketplaceInventory() {
  // Order matters for referential integrity on Mongo relations.
  await db.bid.deleteMany({});
  await db.offer.deleteMany({});
  await db.wishlistItem.deleteMany({});
  await db.wantedItem.deleteMany({});
  await db.adPlacement.deleteMany({});
  await db.certificateLock.deleteMany({});
  await db.verification.deleteMany({});
  await db.invoice.deleteMany({});
  await db.order.deleteMany({});
  await db.auction.deleteMany({});
  await db.listing.deleteMany({});
  console.log("Cleared previous listings, auctions, bids, and related inventory.");
}

async function ensureUser(tier: TierKey) {
  const { email, name } = DEMO_USERS[tier];
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await db.user.upsert({
    where: { email },
    update: {
      subscriptionTier: tier,
      passwordHash,
      name,
      isSaandDealer: tier === "DEALER",
      isCoinClubMember: tier === "SILVER" || tier === "GOLD" || tier === "DEALER",
      completedSalesCount: tier === "DEALER" ? 186 : tier === "GOLD" ? 54 : 0,
    },
    create: {
      email,
      name,
      passwordHash,
      role: "USER",
      subscriptionTier: tier,
      isSaandDealer: tier === "DEALER",
      isCoinClubMember: tier === "SILVER" || tier === "GOLD" || tier === "DEALER",
      completedSalesCount: tier === "DEALER" ? 186 : 0,
    },
  });
  await db.subscription.upsert({
    where: { userId: user.id },
    update: { tier, status: "ACTIVE" },
    create: { userId: user.id, tier, status: "ACTIVE" },
  });
  return user;
}

async function createGradedListing(opts: {
  sellerId: string;
  slug: string;
  title: string;
  description: string;
  category: ListingCategory;
  metal: PreciousMetal;
  year: number;
  denomination: string;
  priceCents: number;
  condition: string;
  certificateId: string;
  provider: VerificationProvider;
  images: string[];
  country?: string;
  weightGrams?: number;
  purityPercent?: number;
  mintage?: number;
  acceptsOffers?: boolean;
  isSponsored?: boolean;
}) {
  const listing = await db.listing.create({
    data: {
      sellerId: opts.sellerId,
      slug: opts.slug,
      title: opts.title,
      description: opts.description,
      category: opts.category,
      listingType: ListingType.GRADED,
      metal: opts.metal,
      condition: opts.condition,
      year: opts.year,
      country: opts.country ?? "South Africa",
      denomination: opts.denomination,
      priceCents: opts.priceCents,
      weightGrams: opts.weightGrams,
      purityPercent: opts.purityPercent,
      mintage: opts.mintage,
      acceptsOffers: opts.acceptsOffers ?? true,
      isSponsored: opts.isSponsored ?? false,
      images: opts.images,
      coverImageUrl: opts.images[0],
      certificateId: opts.certificateId,
      status: "ACTIVE",
    },
  });

  await db.verification.create({
    data: {
      listingId: listing.id,
      provider: opts.provider,
      certificateId: opts.certificateId,
      grade: opts.condition,
      mintage: opts.mintage ?? 5_000,
      historicalNotes: "Seeded catalogue notes for Hern vs. Mintage chart QA.",
      rawApiResponse: buildChartSeries(opts.priceCents),
      shieldAwarded: true,
      feeCents: 1500,
      feeStatus: "PENDING",
    },
  });
  await db.certificateLock.create({
    data: {
      certificateId: opts.certificateId,
      provider: opts.provider,
      listingId: listing.id,
    },
  });

  console.log("Created listing:", opts.slug);
  return listing;
}

async function main() {
  const standard = await ensureUser("STANDARD");
  const silver = await ensureUser("SILVER");
  const gold = await ensureUser("GOLD");
  const dealer = await ensureUser("DEALER");

  await clearMarketplaceInventory();

  const now = Date.now();

  // 1. 1898 ZAR Paul Kruger Veldpond — Live Auction (Sponsored)
  const veldpondAuction = await db.auction.create({
    data: {
      sellerId: dealer.id,
      title: "1898 ZAR Paul Kruger Veldpond — SANGS AU58",
      description:
        "Legendary ZAR Veldpond associated with the Paul Kruger wartime coinage tradition. Certified SANGS AU58 with strong residual lustre and honest wear. Featured dealer auction — sponsored placement on MintMark.",
      images: [IMAGES.veldpond, IMAGES.veldpond],
      category: ListingCategory.COINS,
      metal: PreciousMetal.GOLD,
      startingPriceCents: 125_000_00,
      bidIncrementCents: 5_000_00,
      startsAt: new Date(now - 2 * 60 * 60 * 1000),
      endsAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
      status: "LIVE",
      currentBidCents: 132_000_00,
      currentBidderId: gold.id,
      version: 3,
    },
  });
  const veldBids = [125_000_00, 128_500_00, 132_000_00];
  const veldBidders = [standard, silver, gold];
  for (let i = 0; i < veldBids.length; i++) {
    await db.bid.create({
      data: { auctionId: veldpondAuction.id, bidderId: veldBidders[i].id, amountCents: veldBids[i] },
    });
  }
  console.log("Created auction:", veldpondAuction.title);

  // Also mirror as a sponsored catalogue listing for homepage cards.
  await createGradedListing({
    sellerId: dealer.id,
    slug: "1898-zar-paul-kruger-veldpond-sangs-au58",
    title: "1898 ZAR Paul Kruger Veldpond — SANGS AU58",
    description:
      "Museum-calibre Veldpond presentation piece. SANGS AU58. Sponsored dealer showcase — also offered via live auction floor.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    year: 1898,
    denomination: "1 Veldpond",
    priceCents: 145_000_00,
    condition: "AU58",
    certificateId: "SANGS-SEED-VELDPOND-1898",
    provider: VerificationProvider.SANGS,
    images: [IMAGES.veldpond],
    weightGrams: 7.988,
    purityPercent: 91.67,
    mintage: 986,
    isSponsored: true,
    acceptsOffers: false,
  });

  // 2. 1967 Silver Krugerrand 1oz Proof — Live Auction
  const krugAuction = await db.auction.create({
    data: {
      sellerId: gold.id,
      title: "1967 Silver Krugerrand 1oz Proof — NGC PF69 Ultra Cameo",
      description:
        "First-year silver Krugerrand proof aesthetic in NGC PF69 Ultra Cameo. Deep mirrors, frosted devices, and aggressive bidding already underway.",
      images: [IMAGES.silverKrug, IMAGES.silverKrug],
      category: ListingCategory.KRUGERRAND,
      metal: PreciousMetal.SILVER,
      startingPriceCents: 14_500_00,
      bidIncrementCents: 250_00,
      startsAt: new Date(now - 6 * 60 * 60 * 1000),
      endsAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
      status: "LIVE",
      currentBidCents: 16_750_00,
      currentBidderId: silver.id,
      version: 5,
    },
  });
  const krugBids = [14_500_00, 15_000_00, 15_750_00, 16_250_00, 16_750_00];
  const krugBidders = [standard, silver, gold, standard, silver];
  for (let i = 0; i < krugBids.length; i++) {
    await db.bid.create({
      data: { auctionId: krugAuction.id, bidderId: krugBidders[i].id, amountCents: krugBids[i] },
    });
  }
  console.log("Created auction:", krugAuction.title);

  // 3. 1931 SA Union Farthing — Buy Now
  await createGradedListing({
    sellerId: silver.id,
    slug: "1931-sa-union-farthing-ngc-ms64-bn",
    title: "1931 SA Union Farthing — Key Date (NGC MS64 Brown)",
    description:
      "Key-date Union farthing in NGC MS64 Brown. Scarce in Mint State with chocolate-brown surfaces and sharp peripheral legends. Ideal Hern vs. Mintage chart example.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.BRONZE,
    year: 1931,
    denomination: "1 Farthing",
    priceCents: 4_000_00,
    condition: "MS64 BN",
    certificateId: "NGC-SEED-FARTHING-1931",
    provider: VerificationProvider.NGC,
    images: [IMAGES.farthing],
    mintage: 505_000,
  });

  // 4. 2023 Big Five Buffalo Double Coin Set — Buy Now + offers
  const buffalo = await db.listing.create({
    data: {
      sellerId: gold.id,
      slug: "2023-big-five-buffalo-double-coin-silver-set",
      title: "2023 Big Five Buffalo 1oz Silver Double Coin Set",
      description:
        "Complete 2023 Big Five Buffalo double coin silver set in original SA Mint box with COA. Raw / mint packaging — Accepting Offers from 70% of asking.",
      category: ListingCategory.COINS,
      listingType: ListingType.RAW,
      metal: PreciousMetal.SILVER,
      year: 2023,
      denomination: "Big Five Buffalo Double Coin Set",
      priceCents: 4_200_00,
      weightGrams: 62.2,
      purityPercent: 99.9,
      acceptsOffers: true,
      isSponsored: false,
      images: [IMAGES.buffalo],
      coverImageUrl: IMAGES.buffalo,
      condition: "Mint Box / Raw",
      status: "ACTIVE",
      mintage: 5_000,
    },
  });
  console.log("Created listing:", buffalo.slug);

  // 5. 1989 Cuban Specimen Note — Buy Now
  await createGradedListing({
    sellerId: standard.id,
    slug: "1989-banco-nacional-cuba-10-pesos-specimen",
    title: "1989 Banco Nacional de Cuba 10 Pesos Specimen Note — PCGS 65 EPQ",
    description:
      "Official Banco Nacional de Cuba specimen with SPECIMEN overprint and zeroed serials. PCGS Currency 65 EPQ — a cornerstone Global Specimen Notes reference.",
    category: ListingCategory.BANKNOTES,
    metal: PreciousMetal.NOT_APPLICABLE,
    year: 1989,
    denomination: "10 Pesos Specimen",
    priceCents: 3_400_00,
    condition: "65 EPQ",
    certificateId: "PCGS-SEED-CUBA-1989-10P",
    provider: VerificationProvider.PCGS,
    images: [IMAGES.cuba],
    country: "Cuba",
    mintage: 2_500,
  });

  await db.adPlacement.create({
    data: {
      slotType: "HOMEPAGE_HERO",
      slotPosition: 1,
      listingId: buffalo.id,
      advertiserId: dealer.id,
      imageUrl: IMAGES.veldpond,
      targetUrl: `/auctions/${veldpondAuction.id}`,
      priceCents: 25_000,
      startsAt: new Date(),
      endsAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  const listingCount = await db.listing.count({ where: { status: "ACTIVE" } });
  const auctionCount = await db.auction.count({ where: { status: "LIVE" } });

  console.log(
    JSON.stringify(
      {
        users: {
          standard: standard.email,
          silver: silver.email,
          gold: gold.email,
          dealer: dealer.email,
          password: DEMO_PASSWORD,
        },
        counts: { activeListings: listingCount, liveAuctions: auctionCount },
        featured: {
          veldpondAuction: veldpondAuction.id,
          krugAuction: krugAuction.id,
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
