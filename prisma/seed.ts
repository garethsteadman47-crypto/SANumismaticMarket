/**
 * MintMark demo seed — curated Buy Now + Live Auction catalogue.
 *
 * Maps the marketplace product seed onto the real Prisma schema:
 * - Users use `subscriptionTier` + nested `bankAccount` (not flat bank fields)
 * - Buy Now items → `Listing` (priceCents, subcategory, verification)
 * - Auctions → separate `Auction` + `Bid` rows (not listingType=AUCTION)
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

const IMG = {
  gold: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=800&q=80",
  silver: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
  banknote: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=800&q=80",
  vintage: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80",
} as const;

type SellerKey = "GAUTENG" | "CAPE" | "VELDPOND" | "RANDBURG";

const MOCK_USERS = [
  {
    key: "GAUTENG" as const,
    email: "dealer@gautengcoins.co.za",
    name: "Gauteng Numismatic Exchange",
    tier: "GOLD" as const,
    isVerified: true,
    isSaandDealer: true,
    isCoinClubMember: true,
    completedSalesCount: 214,
    phoneNumber: "+27 12 555 0201",
    location: "Pretoria, GP",
    bio: "Verified SAAND dealer specialising in Krugerrands, international trade dollars, and Republic bullion.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=1600&q=80",
    accolades: ["SAAND_VERIFIED", "COIN_CLUB", "TOP_SELLER_100", "EARLY_ADOPTER"],
    bankAccount: {
      bankName: "First National Bank (FNB)",
      accountNumber: "62849102938",
      branchCode: "250655",
      accountHolderName: "Gauteng Numismatic Exchange CC",
    },
  },
  {
    key: "CAPE" as const,
    email: "info@capeproofs.co.za",
    name: "Cape Proof Collectibles",
    tier: "SILVER" as const,
    isVerified: true,
    isSaandDealer: false,
    isCoinClubMember: true,
    completedSalesCount: 67,
    phoneNumber: "+27 21 555 0142",
    location: "Cape Town, WC",
    bio: "Cape Town boutique for Union proofs, banknotes, and high-grade circulating silver.",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1605177991950-8de6fbd238ac?auto=format&fit=crop&w=1600&q=80",
    accolades: ["COIN_CLUB", "EARLY_ADOPTER"],
    bankAccount: {
      bankName: "Standard Bank",
      accountNumber: "10192837465",
      branchCode: "051001",
      accountHolderName: "Cape Proof Collectibles",
    },
  },
  {
    key: "VELDPOND" as const,
    email: "zar@zarcoins.co.za",
    name: "Veldpond & ZAR Specialist",
    tier: "GOLD" as const,
    isVerified: true,
    isSaandDealer: true,
    isCoinClubMember: true,
    completedSalesCount: 128,
    phoneNumber: "+27 82 555 0199",
    location: "Johannesburg, GP",
    bio: "Focused on ZAR gold rarities, Veldponde, and early Kruger crowns with full provenance.",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1599557997972-00ab56bc7404?auto=format&fit=crop&w=1600&q=80",
    accolades: ["SAAND_VERIFIED", "COIN_CLUB"],
    bankAccount: {
      bankName: "Capitec Bank",
      accountNumber: "1492039481",
      branchCode: "470010",
      accountHolderName: "P. J. Botha",
    },
  },
  {
    key: "RANDBURG" as const,
    email: "seller@randburgfinds.co.za",
    name: "Randburg Rare Finds",
    tier: "STANDARD" as const,
    isVerified: false,
    isSaandDealer: false,
    isCoinClubMember: false,
    completedSalesCount: 9,
    phoneNumber: "+27 11 555 0101",
    location: "Randburg, GP",
    bio: "Local finder of decimal sets, commemoratives, and affordable starter cabinet pieces.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1605335805561-12c8a245585f?auto=format&fit=crop&w=1600&q=80",
    accolades: ["EARLY_ADOPTER"],
    bankAccount: {
      bankName: "Nedbank",
      accountNumber: "19876543210",
      branchCode: "198765",
      accountHolderName: "G. D. Steadman",
    },
  },
] as const;

type GradedSeed = {
  certificateId: string;
  provider: VerificationProvider;
};

type BuyNowSeed = {
  slug: string;
  title: string;
  description: string;
  category: ListingCategory;
  listingType: ListingType;
  metal: PreciousMetal;
  year: number;
  denomination: string;
  /** ZAR rands — converted to cents on create. */
  priceRands: number;
  condition: string;
  seller: SellerKey;
  subcategory: string;
  images: string[];
  country?: string;
  weightGrams?: number;
  purityPercent?: number;
  acceptsOffers?: boolean;
  isSponsored?: boolean;
  graded?: GradedSeed;
};

type AuctionSeed = {
  title: string;
  description: string;
  category: ListingCategory;
  metal: PreciousMetal;
  /** Starting bid in ZAR rands. */
  startingRands: number;
  /** Latest bid in ZAR rands (optional). */
  currentBidRands?: number;
  reserveRands?: number;
  bidIncrementRands?: number;
  endsInDays: number;
  seller: SellerKey;
  images: string[];
  /** Intermediate bid amounts in rands (ending with currentBidRands when set). */
  bidsRands: number[];
};

/** Prices in the product brief are ZAR rands → store as cents. */
function randsToCents(rands: number): number {
  return Math.round(rands * 100);
}

const BUY_NOW: BuyNowSeed[] = [
  {
    slug: "1892-zar-5-shillings-single-shaft-sangs-ms62",
    title: "1892 ZAR 5 Shillings - Single Shaft (SANGS MS62)",
    description:
      "Extremely rare 1892 ZAR 5 Shillings Single Shaft variant. Strong strike with beautiful original mint luster intact. Certified authentic by SANGS.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.SILVER,
    year: 1892,
    denomination: "5 Shillings",
    priceRands: 18_500,
    condition: "MS62",
    seller: "VELDPOND",
    subcategory: "zar",
    images: [IMG.vintage, IMG.silver],
    graded: { certificateId: "SANGS-1892-5S-9021", provider: VerificationProvider.SANGS },
  },
  {
    slug: "1974-1oz-gold-krugerrand-unc",
    title: "1974 1 oz Gold Krugerrand - Uncirculated",
    description:
      "Classic 1oz Gold Krugerrand containing 33.93g of 22k gold (1 troy oz pure fine gold). Pristine uncirculated condition from a private vault.",
    category: ListingCategory.KRUGERRAND,
    listingType: ListingType.BULLION,
    metal: PreciousMetal.GOLD,
    year: 1974,
    denomination: "1oz Gold Krugerrand",
    priceRands: 46_200,
    condition: "UNC",
    seller: "GAUTENG",
    subcategory: "bullion",
    images: [IMG.gold],
    weightGrams: 33.93,
    purityPercent: 91.67,
    isSponsored: true,
  },
  {
    slug: "1931-union-3d-tickey-ngc-ms63",
    title: "1931 Union of South Africa 3d Tickey (NGC MS63)",
    description:
      "Key date 1931 3Pence Tickey. One of the most sought-after Union era coins in higher uncirculated grades. NGC slabbed and verified.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.SILVER,
    year: 1931,
    denomination: "3d Threepence",
    priceRands: 24_000,
    condition: "MS63",
    seller: "CAPE",
    subcategory: "union",
    images: [IMG.silver],
    graded: { certificateId: "NGC-6892014-001", provider: VerificationProvider.NGC },
  },
  {
    slug: "1961-first-decimal-1c-2c-proof-set",
    title: "1961 First Decimal 1c & 2c Proof Set in Official Box",
    description:
      "Official South African Mint proof set celebrating the transition to decimal currency in 1961. Original red plush display box included.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.BRONZE,
    year: 1961,
    denomination: "Proof Set",
    priceRands: 1_250,
    condition: "PROOF",
    seller: "RANDBURG",
    subcategory: "first-decimal",
    images: [IMG.vintage],
    acceptsOffers: true,
  },
  {
    slug: "1902-zar-veldpond-pcgs-au55",
    title: "1902 ZAR Veldpond - Pilot Pilgrim Rest (PCGS AU55)",
    description:
      "Historical masterpiece. Struck at Pilgrim's Rest during the second Anglo-Boer War. Full provenance documentation included.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.GOLD,
    year: 1902,
    denomination: "Veldpond",
    priceRands: 145_000,
    condition: "AU55",
    seller: "VELDPOND",
    subcategory: "zar",
    images: [IMG.gold, IMG.vintage],
    weightGrams: 7.99,
    purityPercent: 91.67,
    graded: { certificateId: "PCGS-8830192", provider: VerificationProvider.PCGS },
    isSponsored: true,
  },
  {
    slug: "1948-sarb-r2-banknote-unc",
    title: "1948 South African Reserve Bank R2 Banknote (Uncirculated)",
    description:
      "Crisp uncirculated vintage banknote with sharp corners and vibrant original ink. No folds or pinholes.",
    category: ListingCategory.BANKNOTES,
    listingType: ListingType.RAW,
    metal: PreciousMetal.NOT_APPLICABLE,
    year: 1948,
    denomination: "R2 Note",
    priceRands: 3_200,
    condition: "UNC",
    seller: "CAPE",
    subcategory: "banknotes",
    images: [IMG.banknote],
  },
  {
    slug: "1923-gb-trade-dollar-ngc-ms61",
    title: "1923 Great Britain Trade Dollar Silver Coin",
    description:
      "British Administration Trade Dollar struck for Eastern trade routes. Sharp rim detail and light pastel toning.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.SILVER,
    year: 1923,
    denomination: "Trade Dollar",
    priceRands: 4_800,
    condition: "MS61",
    seller: "GAUTENG",
    subcategory: "intl-great-britain",
    country: "Great Britain",
    images: [IMG.silver],
    graded: { certificateId: "NGC-4920193", provider: VerificationProvider.NGC },
  },
  {
    slug: "2023-1oz-fine-silver-springbok-medallion",
    title: "2023 1 oz Fine Silver Springbok Medallion",
    description:
      "Pure 999 Fine Silver 1oz commemorative medallion. Sealed in original protective acrylic capsule.",
    category: ListingCategory.MEDALLIONS_TOKENS,
    listingType: ListingType.BULLION,
    metal: PreciousMetal.SILVER,
    year: 2023,
    denomination: "1oz Springbok Medallion",
    priceRands: 650,
    condition: "BU",
    seller: "RANDBURG",
    subcategory: "bullion",
    images: [IMG.silver],
    weightGrams: 31.1,
    purityPercent: 99.9,
    acceptsOffers: true,
  },
];

const LIVE_AUCTIONS: AuctionSeed[] = [
  {
    title: "AUCTION: 1898 ZAR Penny Red (SANGS MS64 RED)",
    description:
      "Outstanding full-red gem ZAR Penny. Exceptionally rare in this grade with full original mint luster.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.COPPER,
    startingRands: 100,
    currentBidRands: 3_400,
    reserveRands: 5_000,
    endsInDays: 2,
    seller: "VELDPOND",
    images: [IMG.vintage],
    bidsRands: [100, 450, 1_200, 2_100, 3_400],
  },
  {
    title: "AUCTION: 1933 Union 1/2d Half Penny (Key Date)",
    description: "Very scarce key date Union Half Penny in Very Fine condition. Low mintage year.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.BRONZE,
    startingRands: 250,
    currentBidRands: 850,
    endsInDays: 4,
    seller: "CAPE",
    images: [IMG.silver],
    bidsRands: [250, 400, 650, 850],
  },
  {
    title: "AUCTION: 1921 German Notgeld Emergency Banknote Set (6 Pcs)",
    description:
      "Complete regional 1921 German Notgeld banknote set in uncirculated condition. Intricate artwork.",
    category: ListingCategory.BANKNOTES,
    metal: PreciousMetal.NOT_APPLICABLE,
    startingRands: 50,
    currentBidRands: 320,
    endsInDays: 1,
    seller: "GAUTENG",
    images: [IMG.banknote],
    bidsRands: [50, 120, 220, 320],
  },
  {
    title: "AUCTION: 1892 ZAR 2 Shillings Double Shaft (PCGS AU50)",
    description:
      "Classic 1892 Double Shaft variant 2 Shillings. Clean surfaces with strong detail across the wagon wheels.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingRands: 1_000,
    currentBidRands: 4_200,
    reserveRands: 6_000,
    endsInDays: 5,
    seller: "VELDPOND",
    images: [IMG.silver, IMG.vintage],
    bidsRands: [1_000, 1_800, 2_900, 4_200],
  },
  {
    title: "AUCTION: 2017 50th Anniversary Silver Krugerrand (NGC PF70)",
    description:
      "Perfect PF70 Ultra Cameo 50th Anniversary Silver Krugerrand with special anniversary mint mark slab.",
    category: ListingCategory.KRUGERRAND,
    metal: PreciousMetal.SILVER,
    startingRands: 500,
    currentBidRands: 1_850,
    endsInDays: 3,
    seller: "GAUTENG",
    images: [IMG.gold],
    bidsRands: [500, 900, 1_350, 1_850],
  },
  {
    title: "AUCTION: 1965 First Series R1 Silver Coin (First Year of Issue)",
    description:
      "First year of issue 800 Silver R1 coin depicting Jan van Riebeeck. Beautiful peripheral rim toning.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingRands: 150,
    currentBidRands: 380,
    endsInDays: 6,
    seller: "RANDBURG",
    images: [IMG.silver],
    bidsRands: [150, 220, 300, 380],
  },
  {
    title: "AUCTION: 1910 Union of South Africa Commemorative Medal",
    description:
      "Scarce 1910 official bronze inauguration medal celebrating the establishment of the Union of South Africa.",
    category: ListingCategory.MEDALLIONS_TOKENS,
    metal: PreciousMetal.BRONZE,
    startingRands: 300,
    currentBidRands: 950,
    endsInDays: 2,
    seller: "CAPE",
    images: [IMG.vintage],
    bidsRands: [300, 500, 750, 950],
  },
  {
    title: "AUCTION: 1896 ZAR 1 Shilling (SANGS AU58)",
    description:
      "Almost uncirculated 1896 ZAR 1 Shilling. Highly desirable condition with sharp obverse bust detail.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingRands: 500,
    currentBidRands: 1_600,
    endsInDays: 4,
    seller: "VELDPOND",
    images: [IMG.silver],
    bidsRands: [500, 850, 1_200, 1_600],
  },
];

async function clearMarketplaceInventory() {
  console.log("Cleaning previous marketplace inventory…");
  await db.message.deleteMany({});
  await db.conversation.deleteMany({});
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
}

async function ensureUser(spec: (typeof MOCK_USERS)[number]) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const profile = {
    name: spec.name,
    phoneNumber: spec.phoneNumber,
    location: spec.location,
    bio: spec.bio,
    avatarUrl: spec.avatarUrl,
    bannerUrl: spec.bannerUrl,
    image: spec.avatarUrl,
    accolades: [...spec.accolades],
    isSaandDealer: spec.isSaandDealer,
    isVerified: spec.isVerified,
    isCoinClubMember: spec.isCoinClubMember,
    completedSalesCount: spec.completedSalesCount,
    subscriptionTier: spec.tier,
    bankAccount: spec.bankAccount,
  };

  const user = await db.user.upsert({
    where: { email: spec.email },
    update: { ...profile, passwordHash },
    create: {
      email: spec.email,
      passwordHash,
      role: "USER",
      ...profile,
    },
  });

  await db.subscription.upsert({
    where: { userId: user.id },
    update: { tier: spec.tier, status: "ACTIVE" },
    create: { userId: user.id, tier: spec.tier, status: "ACTIVE" },
  });

  return user;
}

async function createBuyNow(opts: BuyNowSeed & { sellerId: string }) {
  const priceCents = randsToCents(opts.priceRands);
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
      priceCents,
      weightGrams: opts.weightGrams,
      purityPercent: opts.purityPercent,
      acceptsOffers: opts.acceptsOffers ?? true,
      isSponsored: opts.isSponsored ?? false,
      isFeatured: opts.isSponsored ?? false,
      subcategory: opts.subcategory,
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
        historicalNotes: "Seeded catalogue notes for demo QA.",
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

  console.log("Created Buy Now:", opts.slug);
  return listing;
}

async function main() {
  console.log("Starting MintMark database seed…");

  if (BUY_NOW.length !== 8) throw new Error(`Expected 8 Buy Now listings, got ${BUY_NOW.length}`);
  if (LIVE_AUCTIONS.length !== 8) throw new Error(`Expected 8 auctions, got ${LIVE_AUCTIONS.length}`);

  const usersByKey = {} as Record<SellerKey, { id: string; email: string; name: string | null }>;

  for (const spec of MOCK_USERS) {
    const user = await ensureUser(spec);
    usersByKey[spec.key] = user;
    console.log(`User ready: ${spec.name} (${spec.tier}, verified=${spec.isVerified})`);
  }

  await clearMarketplaceInventory();

  console.log(`Seeding ${BUY_NOW.length} Buy Now listings…`);
  for (const item of BUY_NOW) {
    await createBuyNow({ ...item, sellerId: usersByKey[item.seller].id });
  }

  const now = Date.now();
  const bidders = [usersByKey.RANDBURG, usersByKey.CAPE, usersByKey.GAUTENG, usersByKey.VELDPOND];

  console.log(`Seeding ${LIVE_AUCTIONS.length} live auctions…`);
  for (const item of LIVE_AUCTIONS) {
    const seller = usersByKey[item.seller];
    const currentBidCents =
      item.currentBidRands != null ? randsToCents(item.currentBidRands) : null;
    const reserveCents = item.reserveRands != null ? randsToCents(item.reserveRands) : undefined;
    const currentBidder =
      currentBidCents != null ? bidders[(item.bidsRands.length - 1) % bidders.length] : null;

    const auction = await db.auction.create({
      data: {
        sellerId: seller.id,
        title: item.title,
        description: item.description,
        images: item.images,
        category: item.category,
        metal: item.metal,
        startingPriceCents: randsToCents(item.startingRands),
        bidIncrementCents: randsToCents(item.bidIncrementRands ?? 50),
        reservePriceCents: reserveCents,
        isReserveMet:
          reserveCents == null ? true : currentBidCents != null && currentBidCents >= reserveCents,
        startsAt: new Date(now - 6 * 60 * 60 * 1000),
        endsAt: new Date(now + item.endsInDays * 24 * 60 * 60 * 1000),
        status: "LIVE",
        currentBidCents,
        currentBidderId: currentBidder?.id,
        version: item.bidsRands.length,
      },
    });

    for (let i = 0; i < item.bidsRands.length; i++) {
      const bidder = bidders[i % bidders.length]!;
      // Avoid seller bidding on their own auction when the rotation lands on them.
      const safeBidder = bidder.id === seller.id ? bidders[(i + 1) % bidders.length]! : bidder;
      await db.bid.create({
        data: {
          auctionId: auction.id,
          bidderId: safeBidder.id,
          amountCents: randsToCents(item.bidsRands[i]!),
          maxBidCents: randsToCents(item.bidsRands[i]!),
          createdAt: new Date(now - (item.bidsRands.length - i) * 45 * 60 * 1000),
        },
      });
    }

    console.log(`Created auction: ${item.title} (ends in ${item.endsInDays}d)`);
  }

  const listingCount = await db.listing.count({ where: { status: "ACTIVE" } });
  const auctionCount = await db.auction.count({ where: { status: "LIVE" } });

  console.log(
    JSON.stringify(
      {
        users: MOCK_USERS.map((u) => ({
          name: u.name,
          email: u.email,
          tier: u.tier,
          isVerified: u.isVerified,
        })),
        password: DEMO_PASSWORD,
        counts: { activeListings: listingCount, liveAuctions: auctionCount },
      },
      null,
      2,
    ),
  );
  console.log("Seeding completed successfully.");
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
