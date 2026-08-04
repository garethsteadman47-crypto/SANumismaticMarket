/**
 * MintMark flood seed — clears inventory, then inserts 15 live auctions
 * (with dense bid histories) plus fixed-price catalogue listings mapped to
 * the simplified parent/child taxonomy (ZAR, Union, Republic, Bullion, Sets, Banknotes).
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

/** High-res Unsplash coin / bullion / currency photography */
const IMG = {
  goldCoin:
    "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=80",
  goldStack:
    "https://images.unsplash.com/photo-1624365168968-f283d506c6b6?auto=format&fit=crop&w=1200&q=80",
  silverCoin:
    "https://images.unsplash.com/photo-1589758438368-0ad519228089?auto=format&fit=crop&w=1200&q=80",
  silverKrug:
    "https://images.unsplash.com/photo-1605177991950-8de6fbd238ac?auto=format&fit=crop&w=1200&q=80",
  copper:
    "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80",
  proofSet:
    "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=1200&q=80",
  wildlife:
    "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?auto=format&fit=crop&w=1200&q=80",
  banknote:
    "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=1200&q=80",
  vintageNote:
    "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=1200&q=80",
  bars:
    "https://images.unsplash.com/photo-1610375461369-d613b564f4c4?auto=format&fit=crop&w=1200&q=80",
  crown:
    "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=1200&q=80",
  commemorative:
    "https://images.unsplash.com/photo-1605792657660-596af9009e82?auto=format&fit=crop&w=1200&q=80",
  veldpond:
    "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=1200&q=80",
  buffalo:
    "https://images.unsplash.com/photo-1599557997972-00ab56bc7404?auto=format&fit=crop&w=1200&q=80",
} as const;

function buildChartSeries(currentPriceCents: number, quarters = 12) {
  const startRatio = 0.48;
  const points: {
    date: string;
    realizedPriceCents: number;
    hernsIndexCents: number;
    mintageProxy: number;
  }[] = [];
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

type AuctionSeed = {
  title: string;
  description: string;
  images: string[];
  category: ListingCategory;
  metal: PreciousMetal;
  startingPriceCents: number;
  bidIncrementCents: number;
  reservePriceCents?: number;
  endsInHours: number;
  startedHoursAgo: number;
  seller: TierKey;
  bids: number[];
  /** Taxonomy hint for logging / QA */
  taxonomy: string;
};

type FixedSeed = {
  slug: string;
  title: string;
  description: string;
  category: ListingCategory;
  listingType: ListingType;
  metal: PreciousMetal;
  year: number;
  denomination: string;
  priceCents: number;
  condition: string;
  images: string[];
  seller: TierKey;
  taxonomy: string;
  country?: string;
  weightGrams?: number;
  purityPercent?: number;
  mintage?: number;
  acceptsOffers?: boolean;
  isSponsored?: boolean;
  graded?: {
    certificateId: string;
    provider: VerificationProvider;
  };
};

const LIVE_AUCTIONS: AuctionSeed[] = [
  {
    taxonomy: "ZAR / Ponde",
    title: "1898 ZAR Paul Kruger Veldpond — SANGS AU58",
    description:
      "Legendary ZAR Veldpond with wartime association. Strong residual lustre and honest wear. Sponsored dealer floor lot.",
    images: [IMG.veldpond, IMG.goldCoin],
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 125_000_00,
    bidIncrementCents: 5_000_00,
    reservePriceCents: 130_000_00,
    endsInHours: 72,
    startedHoursAgo: 2,
    seller: "DEALER",
    bids: [125_000_00, 128_500_00, 132_000_00, 136_500_00],
  },
  {
    taxonomy: "ZAR / Half Ponde",
    title: "1895 ZAR Half Pond — PCGS AU58",
    description: "Scarcer half-ponde date with residual lustre. Softly struck as typical for the issue.",
    images: [IMG.goldStack, IMG.goldCoin],
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 42_000_00,
    bidIncrementCents: 1_000_00,
    reservePriceCents: 48_000_00,
    endsInHours: 52,
    startedHoursAgo: 8,
    seller: "DEALER",
    bids: [43_000_00, 45_500_00, 47_800_00],
  },
  {
    taxonomy: "ZAR / Pennies",
    title: "1898 ZAR Penny — SANGS VF35",
    description: "Even chocolate-brown surfaces. Attractive circulated Kruger penny for type sets.",
    images: [IMG.copper],
    category: ListingCategory.COINS,
    metal: PreciousMetal.COPPER,
    startingPriceCents: 1_200_00,
    bidIncrementCents: 50_00,
    endsInHours: 18,
    startedHoursAgo: 12,
    seller: "SILVER",
    bids: [1_250_00, 1_350_00, 1_550_00, 1_750_00, 1_900_00],
  },
  {
    taxonomy: "Union / Shillings",
    title: "1923 Union Shilling — NGC MS62",
    description: "First-year Union shilling with satiny cartwheel lustre. Scarce in mint state.",
    images: [IMG.silverCoin],
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 4_800_00,
    bidIncrementCents: 150_00,
    reservePriceCents: 5_500_00,
    endsInHours: 28,
    startedHoursAgo: 6,
    seller: "SILVER",
    bids: [5_000_00, 5_400_00, 5_800_00, 6_100_00],
  },
  {
    taxonomy: "Union / Farthings",
    title: "1931 Union Farthing — PCGS MS64 BN",
    description: "Choice brown mint state with glossy fields. Popular low-mintage Union copper.",
    images: [IMG.copper, IMG.copper],
    category: ListingCategory.COINS,
    metal: PreciousMetal.BRONZE,
    startingPriceCents: 2_200_00,
    bidIncrementCents: 100_00,
    endsInHours: 44,
    startedHoursAgo: 10,
    seller: "GOLD",
    bids: [2_400_00, 2_650_00, 2_900_00, 3_150_00],
  },
  {
    taxonomy: "Union / Crowns",
    title: "1947 Union Crown — NGC MS63",
    description: "Royal visit commemorative crown. Bright white surfaces with light bagmarks only.",
    images: [IMG.crown, IMG.silverCoin],
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 3_600_00,
    bidIncrementCents: 100_00,
    endsInHours: 60,
    startedHoursAgo: 4,
    seller: "SILVER",
    bids: [3_800_00, 4_100_00, 4_350_00],
  },
  {
    taxonomy: "Republic / R1",
    title: "1967 Republic R1 Gold — NGC MS65",
    description: "First-year Republic gold rand. Fully brilliant with sharp devices.",
    images: [IMG.goldCoin],
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 18_500_00,
    bidIncrementCents: 500_00,
    reservePriceCents: 19_800_00,
    endsInHours: 22,
    startedHoursAgo: 14,
    seller: "DEALER",
    bids: [19_000_00, 19_600_00, 20_200_00, 20_900_00],
  },
  {
    taxonomy: "Republic / R2",
    title: "1980 Republic R2 Gold — SANGS MS64",
    description: "Two-rand gold with orange-peel lustre. Popular bullion-adjacent Republic type.",
    images: [IMG.goldStack],
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 12_800_00,
    bidIncrementCents: 250_00,
    endsInHours: 70,
    startedHoursAgo: 3,
    seller: "GOLD",
    bids: [13_200_00, 13_600_00],
  },
  {
    taxonomy: "Republic / Fractional",
    title: "1979 Fractional Gold Set — Mint Packaging",
    description: "Complete fractional gold set in original SA Mint packaging. Ideal Republic fractional type lot.",
    images: [IMG.goldStack, IMG.goldCoin],
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 28_000_00,
    bidIncrementCents: 750_00,
    reservePriceCents: 31_000_00,
    endsInHours: 48,
    startedHoursAgo: 20,
    seller: "DEALER",
    bids: [28_500_00, 29_800_00, 30_500_00, 31_250_00],
  },
  {
    taxonomy: "Bullion / Silver Krugerrands",
    title: "2024 Silver Krugerrand — NGC MS70 First Releases",
    description: "Flawless modern silver Krugerrand. First Releases designation in NGC holder.",
    images: [IMG.silverKrug, IMG.silverCoin],
    category: ListingCategory.KRUGERRAND,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 1_450_00,
    bidIncrementCents: 50_00,
    endsInHours: 14,
    startedHoursAgo: 9,
    seller: "GOLD",
    bids: [1_520_00, 1_610_00, 1_680_00, 1_750_00, 1_820_00],
  },
  {
    taxonomy: "Bullion / Gold",
    title: "1oz Gold Krugerrand — 2023 Bullion",
    description: "Standard 1oz gold Krugerrand. Spot-linked bidding with dense floor activity.",
    images: [IMG.goldCoin, IMG.goldStack],
    category: ListingCategory.KRUGERRAND,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 68_000_00,
    bidIncrementCents: 500_00,
    endsInHours: 30,
    startedHoursAgo: 5,
    seller: "DEALER",
    bids: [68_800_00, 69_500_00, 70_200_00],
  },
  {
    taxonomy: "Bullion / Bars",
    title: "100g Fine Silver Bar — SA Mint",
    description: "Sealed 100g .999 silver bar from the South African Mint. Ideal stacker lot.",
    images: [IMG.bars],
    category: ListingCategory.BULLION,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 3_200_00,
    bidIncrementCents: 100_00,
    endsInHours: 40,
    startedHoursAgo: 7,
    seller: "GOLD",
    bids: [3_350_00, 3_500_00, 3_650_00],
  },
  {
    taxonomy: "Sets / Wildlife",
    title: "2015 Big Five Buffalo Proof Set — OGP",
    description: "Complete Buffalo wildlife proof set in original mint packaging with COA.",
    images: [IMG.wildlife, IMG.buffalo],
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 14_500_00,
    bidIncrementCents: 250_00,
    reservePriceCents: 16_000_00,
    endsInHours: 55,
    startedHoursAgo: 11,
    seller: "GOLD",
    bids: [15_000_00, 15_800_00, 16_400_00, 17_000_00],
  },
  {
    taxonomy: "Sets / Commemoratives",
    title: "1994 Democracy Commemorative Proof Set",
    description: "Historic commemorative proof set celebrating South Africa's first democratic elections.",
    images: [IMG.commemorative, IMG.proofSet],
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 2_800_00,
    bidIncrementCents: 100_00,
    endsInHours: 26,
    startedHoursAgo: 15,
    seller: "SILVER",
    bids: [3_000_00, 3_250_00, 3_450_00],
  },
  {
    taxonomy: "Sets / Proof Sets",
    title: "1982 SA Mint Proof Set — Original Case",
    description: "Complete yearly proof set with all denominations in original SA Mint case.",
    images: [IMG.proofSet],
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 1_900_00,
    bidIncrementCents: 75_00,
    endsInHours: 33,
    startedHoursAgo: 4,
    seller: "SILVER",
    bids: [2_050_00, 2_200_00, 2_350_00],
  },
];

const FIXED_LISTINGS: FixedSeed[] = [
  {
    taxonomy: "Sets / Double Sets",
    slug: "2000-millennium-double-proof-set",
    title: "Double Proof Set — 2000 Millennium",
    description: "Paired double proof set in original presentation. Fixed-price dealer inventory.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.SILVER,
    year: 2000,
    denomination: "Double Coin Set",
    priceCents: 4_250_00,
    condition: "Proof / OGP",
    images: [IMG.proofSet],
    seller: "GOLD",
    acceptsOffers: true,
    mintage: 3_500,
  },
  {
    taxonomy: "Sets / Wildlife",
    slug: "2023-big-five-buffalo-double-coin-silver-set",
    title: "2023 Big Five Buffalo 1oz Silver Double Coin Set",
    description:
      "Complete 2023 Big Five Buffalo double coin silver set in original SA Mint box with COA. Accepting Offers.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.SILVER,
    year: 2023,
    denomination: "Big Five Buffalo Double Coin Set",
    priceCents: 4_200_00,
    condition: "Mint Box / Raw",
    images: [IMG.buffalo],
    seller: "GOLD",
    weightGrams: 62.2,
    purityPercent: 99.9,
    acceptsOffers: true,
    isSponsored: true,
    mintage: 5_000,
  },
  {
    taxonomy: "ZAR / Ponde",
    slug: "1898-zar-paul-kruger-veldpond-sangs-au58",
    title: "1898 ZAR Paul Kruger Veldpond — SANGS AU58",
    description: "Museum-calibre Veldpond showcase listing mirrored from the live auction floor.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.GOLD,
    year: 1898,
    denomination: "1 Veldpond",
    priceCents: 145_000_00,
    condition: "AU58",
    images: [IMG.veldpond],
    seller: "DEALER",
    weightGrams: 7.988,
    purityPercent: 91.67,
    mintage: 986,
    isSponsored: true,
    acceptsOffers: false,
    graded: {
      certificateId: "SANGS-SEED-VELDPOND-1898",
      provider: VerificationProvider.SANGS,
    },
  },
  {
    taxonomy: "Union / Farthings",
    slug: "1931-sa-union-farthing-ngc-ms64-bn",
    title: "1931 SA Union Farthing — Key Date (NGC MS64 Brown)",
    description: "Key-date Union farthing in NGC MS64 Brown. Ideal Hern vs. Mintage chart example.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.BRONZE,
    year: 1931,
    denomination: "1 Farthing",
    priceCents: 4_000_00,
    condition: "MS64 BN",
    images: [IMG.copper],
    seller: "SILVER",
    mintage: 505_000,
    graded: {
      certificateId: "NGC-SEED-FARTHING-1931",
      provider: VerificationProvider.NGC,
    },
  },
  {
    taxonomy: "Banknotes / Specimen",
    slug: "1990-reserve-bank-specimen-r100",
    title: "Reserve Bank Specimen R100 — Uncirculated",
    description: "Official specimen banknote with SPECIMEN overprint. Crisp corners, no folds.",
    category: ListingCategory.BANKNOTES,
    listingType: ListingType.RAW,
    metal: PreciousMetal.NOT_APPLICABLE,
    year: 1990,
    denomination: "R100 Specimen",
    priceCents: 6_800_00,
    condition: "UNC",
    images: [IMG.banknote],
    seller: "STANDARD",
    acceptsOffers: true,
  },
  {
    taxonomy: "Banknotes / Vintage",
    slug: "1955-union-vintage-banknote-pair",
    title: "1950s Union Vintage Banknote Pair",
    description: "Two mid-century Union-era notes with honest circulation. Attractive colour remaining.",
    category: ListingCategory.BANKNOTES,
    listingType: ListingType.RAW,
    metal: PreciousMetal.NOT_APPLICABLE,
    year: 1955,
    denomination: "Vintage Note Pair",
    priceCents: 1_450_00,
    condition: "VF",
    images: [IMG.vintageNote],
    seller: "STANDARD",
  },
  {
    taxonomy: "Banknotes / Global",
    slug: "1989-banco-nacional-cuba-10-pesos-specimen",
    title: "1989 Banco Nacional de Cuba 10 Pesos Specimen — PCGS 65 EPQ",
    description:
      "Official Banco Nacional de Cuba specimen with SPECIMEN overprint. Global banknote reference for topical collectors.",
    category: ListingCategory.BANKNOTES,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.NOT_APPLICABLE,
    year: 1989,
    denomination: "10 Pesos Specimen",
    priceCents: 3_400_00,
    condition: "65 EPQ",
    images: [IMG.banknote],
    seller: "STANDARD",
    country: "Cuba",
    mintage: 2_500,
    graded: {
      certificateId: "PCGS-SEED-CUBA-1989-10P",
      provider: VerificationProvider.PCGS,
    },
  },
];

async function clearMarketplaceInventory() {
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

async function createListing(opts: FixedSeed & { sellerId: string }) {
  const listing = await db.listing.create({
    data: {
      sellerId: opts.sellerId,
      slug: opts.slug,
      title: opts.title,
      description: opts.description,
      category: opts.category,
      listingType: opts.listingType,
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
      certificateId: opts.graded?.certificateId,
      status: "ACTIVE",
    },
  });

  if (opts.graded) {
    await db.verification.create({
      data: {
        listingId: listing.id,
        provider: opts.graded.provider,
        certificateId: opts.graded.certificateId,
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
        certificateId: opts.graded.certificateId,
        provider: opts.graded.provider,
        listingId: listing.id,
      },
    });
  }

  console.log("Created listing:", opts.slug, `(${opts.taxonomy})`);
  return listing;
}

async function main() {
  const standard = await ensureUser("STANDARD");
  const silver = await ensureUser("SILVER");
  const gold = await ensureUser("GOLD");
  const dealer = await ensureUser("DEALER");

  const usersByTier: Record<TierKey, { id: string }> = {
    STANDARD: standard,
    SILVER: silver,
    GOLD: gold,
    DEALER: dealer,
  };
  const bidders = [standard, silver, gold, dealer];

  await clearMarketplaceInventory();

  const now = Date.now();
  console.log(`Seeding ${LIVE_AUCTIONS.length} live auctions…`);

  for (const item of LIVE_AUCTIONS) {
    const seller = usersByTier[item.seller];
    const currentBid = item.bids[item.bids.length - 1] ?? null;
    const currentBidder = currentBid != null ? bidders[(item.bids.length - 1) % bidders.length] : null;

    const auction = await db.auction.create({
      data: {
        sellerId: seller.id,
        title: item.title,
        description: item.description,
        images: item.images,
        category: item.category,
        metal: item.metal,
        startingPriceCents: item.startingPriceCents,
        bidIncrementCents: item.bidIncrementCents,
        reservePriceCents: item.reservePriceCents,
        startsAt: new Date(now - item.startedHoursAgo * 60 * 60 * 1000),
        endsAt: new Date(now + item.endsInHours * 60 * 60 * 1000),
        status: "LIVE",
        currentBidCents: currentBid,
        currentBidderId: currentBidder?.id,
        version: item.bids.length,
      },
    });

    for (let i = 0; i < item.bids.length; i++) {
      await db.bid.create({
        data: {
          auctionId: auction.id,
          bidderId: bidders[i % bidders.length]!.id,
          amountCents: item.bids[i]!,
          createdAt: new Date(now - (item.bids.length - i) * 45 * 60 * 1000),
        },
      });
    }

    console.log("Created auction:", item.title, `(${item.taxonomy}, ${item.bids.length} bids)`);
  }

  console.log(`Seeding ${FIXED_LISTINGS.length} fixed-price listings…`);
  let featuredListingId: string | undefined;
  for (const item of FIXED_LISTINGS) {
    const listing = await createListing({
      ...item,
      sellerId: usersByTier[item.seller].id,
    });
    if (item.slug.includes("buffalo")) featuredListingId = listing.id;
  }

  if (featuredListingId) {
    await db.adPlacement.create({
      data: {
        slotType: "HOMEPAGE_HERO",
        slotPosition: 1,
        listingId: featuredListingId,
        advertiserId: dealer.id,
        imageUrl: IMG.veldpond,
        targetUrl: "/auctions",
        priceCents: 25_000,
        startsAt: new Date(),
        endsAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });
  }

  // Sample wanted request for UI density (wishlist requires a listingId).
  await db.wantedItem.create({
    data: {
      userId: silver.id,
      eraCategory: "Union",
      targetYear: 1925,
      minimumGrade: "MS60",
      budgetCents: 5_000_00,
      notes: "Looking for a 1925 Union Farthing — prefer NGC or PCGS.",
      status: "OPEN",
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
      },
      null,
      2,
    ),
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
