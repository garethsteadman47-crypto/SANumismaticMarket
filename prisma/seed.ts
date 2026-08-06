/**
 * MintMark flood seed — 4 badge-ready sellers, 10 live auctions (with bids),
 * and 20 fixed-price listings mapped to the expanded parent/child taxonomy.
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

const MOCK_USERS = [
  {
    key: "DEALER" as const,
    email: "bassani@demo.local",
    name: "Bassani Numismatics",
    tier: "DEALER" as const,
    isSaandDealer: true,
    isCoinClubMember: true,
    completedSalesCount: 186,
    phoneNumber: "+27 12 555 0186",
    location: "Pretoria, GP",
    bio: "SAAND dealer specialising in ZAR gold, Union proofs, and scarce Republic R1–R5 varieties.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=1600&q=80",
    accolades: ["SAAND_VERIFIED", "COIN_CLUB", "TOP_SELLER_100", "EARLY_ADOPTER"],
  },
  {
    key: "GOLD" as const,
    email: "pretoriagold@demo.local",
    name: "PretoriaGold",
    tier: "GOLD" as const,
    isSaandDealer: false,
    isCoinClubMember: true,
    completedSalesCount: 54,
    phoneNumber: "+27 82 555 0142",
    location: "Johannesburg, GP",
    bio: "Power trader focused on Krugerrands, Natura series, and high-grade Union silver.",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1605177991950-8de6fbd238ac?auto=format&fit=crop&w=1600&q=80",
    accolades: ["COIN_CLUB", "EARLY_ADOPTER"],
  },
  {
    key: "SILVER" as const,
    email: "unionhunter@demo.local",
    name: "UnionHunter",
    tier: "SILVER" as const,
    isSaandDealer: false,
    isCoinClubMember: true,
    completedSalesCount: 12,
    phoneNumber: "+27 71 555 0199",
    location: "Cape Town, WC",
    bio: "Collecting Union florins, shillings, and early Republic circulating crowns.",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1599557997972-00ab56bc7404?auto=format&fit=crop&w=1600&q=80",
    accolades: ["COIN_CLUB"],
  },
  {
    key: "STANDARD" as const,
    email: "casual@demo.local",
    name: "CasualCollector",
    tier: "STANDARD" as const,
    isSaandDealer: false,
    isCoinClubMember: false,
    completedSalesCount: 0,
    phoneNumber: "+27 83 555 0101",
    location: "Durban, KZN",
    bio: "New to organised collecting — building a starter cabinet of modern SA commemoratives.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1605335805561-12c8a245585f?auto=format&fit=crop&w=1600&q=80",
    accolades: ["EARLY_ADOPTER"],
  },
] as const;

type SellerKey = (typeof MOCK_USERS)[number]["key"];

const PHOTOS = [
  "https://images.unsplash.com/photo-1605177991950-8de6fbd238ac?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1599557997972-00ab56bc7404?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1605335805561-12c8a245585f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1628156172608-8e6f1a8e19e7?auto=format&fit=crop&w=1200&q=80",
] as const;

function photo(index: number): string {
  return PHOTOS[index % PHOTOS.length]!;
}

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
  points[points.length - 1]!.realizedPriceCents = currentPriceCents;
  return { source: "Minted.co.za × Hern's Handbook", points };
}

type AuctionSeed = {
  title: string;
  description: string;
  category: ListingCategory;
  metal: PreciousMetal;
  startingPriceCents: number;
  bidIncrementCents: number;
  reservePriceCents?: number;
  endsInHours: number;
  startedHoursAgo: number;
  seller: SellerKey;
  bids: number[];
  photoIndex: number;
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
  seller: SellerKey;
  taxonomy: string;
  photoIndex: number;
  country?: string;
  weightGrams?: number;
  purityPercent?: number;
  mintage?: number;
  acceptsOffers?: boolean;
  isSponsored?: boolean;
  graded?: { certificateId: string; provider: VerificationProvider };
};

/** 10 live auctions — titles/keywords align with expanded taxonomy leaves. */
const LIVE_AUCTIONS: AuctionSeed[] = [
  {
    taxonomy: "ZAR / Crowns",
    title: "1892 ZAR Kruger Crown Double Shaft — SANGS AU55",
    description:
      "First-year ZAR crown with the scarce Double Shaft variety. Strong residual lustre under honest wear.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 28_000_00,
    bidIncrementCents: 500_00,
    reservePriceCents: 32_000_00,
    endsInHours: 42,
    startedHoursAgo: 8,
    seller: "DEALER",
    bids: [28_500_00, 30_000_00, 31_500_00, 33_250_00],
    photoIndex: 1,
  },
  {
    taxonomy: "Union / Crowns",
    title: "1923 SA Union Sovereign Gold — NGC MS62",
    description: "First-year Union gold sovereign aesthetic with satiny cartwheel lustre. NGC MS62.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 22_500_00,
    bidIncrementCents: 500_00,
    endsInHours: 30,
    startedHoursAgo: 12,
    seller: "GOLD",
    bids: [23_000_00, 24_250_00, 25_500_00],
    photoIndex: 0,
  },
  {
    taxonomy: "Bullion / Silver Krugerrands",
    title: "2017 Krugerrand 50th Anniversary 1oz Silver Proof — NGC PF69",
    description: "Anniversary silver Krugerrand proof in NGC PF69 Ultra Cameo. Deep mirrors, frosted devices.",
    category: ListingCategory.KRUGERRAND,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 3_800_00,
    bidIncrementCents: 100_00,
    endsInHours: 18,
    startedHoursAgo: 6,
    seller: "GOLD",
    bids: [3_950_00, 4_200_00, 4_450_00, 4_700_00],
    photoIndex: 0,
  },
  {
    taxonomy: "Union / Crowns",
    title: "1947 SA Union Crown Royal Visit — PCGS MS64",
    description: "Royal Visit commemorative crown. Bright white surfaces with only light bagmarks.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 4_200_00,
    bidIncrementCents: 150_00,
    endsInHours: 55,
    startedHoursAgo: 4,
    seller: "SILVER",
    bids: [4_400_00, 4_750_00, 5_100_00],
    photoIndex: 1,
  },
  {
    taxonomy: "ZAR / Veldpond",
    title: "1898 ZAR Kruger Veldpond — Raw, highly detailed",
    description:
      "Legendary wartime Veldpond with sharp devices and even chocolate tone. Raw cabinet piece for specialists.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 125_000_00,
    bidIncrementCents: 5_000_00,
    reservePriceCents: 135_000_00,
    endsInHours: 72,
    startedHoursAgo: 3,
    seller: "DEALER",
    bids: [128_000_00, 132_500_00, 138_000_00],
    photoIndex: 1,
  },
  {
    taxonomy: "Union / Half Crowns",
    title: "1928 SA Union 2.5 Shillings — NGC MS63",
    description: "Choice mint-state half crown with satiny fields. Popular Union silver type.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 5_600_00,
    bidIncrementCents: 150_00,
    endsInHours: 36,
    startedHoursAgo: 10,
    seller: "SILVER",
    bids: [5_800_00, 6_200_00, 6_550_00],
    photoIndex: 3,
  },
  {
    taxonomy: "Republic / R5",
    title: "1994 Mandela Inauguration R5 Proof — SANGS PF68",
    description: "Historic Mandela inauguration commemorative R5 proof. Soft cameo contrast.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 1_850_00,
    bidIncrementCents: 75_00,
    endsInHours: 24,
    startedHoursAgo: 14,
    seller: "STANDARD",
    bids: [1_950_00, 2_100_00, 2_250_00],
    photoIndex: 2,
  },
  {
    taxonomy: "Sets / Protea Sets",
    title: "1989 Protea 1oz Gold Proof — NGC PF69",
    description: "Protea series one-ounce gold proof. Deep mirrors with sharp devices.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.GOLD,
    startingPriceCents: 68_000_00,
    bidIncrementCents: 1_000_00,
    endsInHours: 48,
    startedHoursAgo: 5,
    seller: "GOLD",
    bids: [69_500_00, 71_000_00, 72_750_00],
    photoIndex: 0,
  },
  {
    taxonomy: "Sets / Wildlife Series (Big Five)",
    title: "2020 Big Five Elephant 1oz Silver Set — Raw Boxed",
    description: "Complete Elephant wildlife silver set in original SA Mint box with COA.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.SILVER,
    startingPriceCents: 6_400_00,
    bidIncrementCents: 200_00,
    endsInHours: 60,
    startedHoursAgo: 9,
    seller: "GOLD",
    bids: [6_600_00, 7_000_00, 7_400_00],
    photoIndex: 2,
  },
  {
    taxonomy: "Union / Farthings",
    title: "1931 Union Farthing Key Date — NGC MS64 Brown",
    description: "Key-date Union farthing in NGC MS64 Brown. Glossy chocolate surfaces.",
    category: ListingCategory.COINS,
    metal: PreciousMetal.BRONZE,
    startingPriceCents: 2_400_00,
    bidIncrementCents: 100_00,
    endsInHours: 20,
    startedHoursAgo: 11,
    seller: "SILVER",
    bids: [2_550_00, 2_800_00, 3_050_00, 3_300_00],
    photoIndex: 3,
  },
];

/** 20 fixed-price Buy Now listings spanning the taxonomy. */
const FIXED_LISTINGS: FixedSeed[] = [
  // —— 5× ZAR ——
  {
    taxonomy: "ZAR / Shillings",
    slug: "1894-zar-shilling-sangs-vf30",
    title: "1894 ZAR Shilling — SANGS VF30",
    description: "Evenly circulated Kruger shilling with clear legends and attractive grey tone.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.SILVER,
    year: 1894,
    denomination: "1 Shilling",
    priceCents: 1_850_00,
    condition: "VF30",
    seller: "SILVER",
    photoIndex: 1,
    graded: { certificateId: "SANGS-SEED-ZAR-SHILLING-1894", provider: VerificationProvider.SANGS },
    mintage: 336_000,
  },
  {
    taxonomy: "ZAR / Pennies",
    slug: "1897-zar-penny-raw-vf",
    title: "1897 ZAR Penny — Raw VF",
    description: "Chocolate-brown Kruger penny with honest circulation. Ideal type starter.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.COPPER,
    year: 1897,
    denomination: "1 Penny",
    priceCents: 285_00,
    condition: "VF",
    seller: "STANDARD",
    photoIndex: 3,
    acceptsOffers: true,
  },
  {
    taxonomy: "ZAR / Half Ponde",
    slug: "1896-zar-half-ponde-pcgs-au53",
    title: "1896 ZAR Half Ponde — PCGS AU53",
    description: "Scarcer half-ponde date with residual lustre in the protected areas.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.GOLD,
    year: 1896,
    denomination: "Half Pond",
    priceCents: 48_500_00,
    condition: "AU53",
    seller: "DEALER",
    photoIndex: 0,
    weightGrams: 3.994,
    purityPercent: 91.67,
    graded: { certificateId: "PCGS-SEED-ZAR-HALF-POND-1896", provider: VerificationProvider.PCGS },
    isSponsored: true,
  },
  {
    taxonomy: "ZAR / Sixpences",
    slug: "1895-zar-sixpence-raw",
    title: "1895 ZAR Sixpence (6d) — Raw Fine",
    description: "Affordable Kruger sixpence for date collectors. Clear date and devices.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.SILVER,
    year: 1895,
    denomination: "6d Sixpence",
    priceCents: 145_00,
    condition: "Fine",
    seller: "STANDARD",
    photoIndex: 4,
  },
  {
    taxonomy: "ZAR / Threepences",
    slug: "1898-zar-threepence-ngc-au58",
    title: "1898 ZAR Threepence (3d) — NGC AU58",
    description: "Nearly uncirculated Kruger tickey with soft lustre remaining.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.SILVER,
    year: 1898,
    denomination: "3d Threepence",
    priceCents: 920_00,
    condition: "AU58",
    seller: "GOLD",
    photoIndex: 1,
    graded: { certificateId: "NGC-SEED-ZAR-3D-1898", provider: VerificationProvider.NGC },
  },
  // —— 5× Union ——
  {
    taxonomy: "Sets / Proof Sets",
    slug: "1952-union-proof-set-ogp",
    title: "1952 SA Union Proof Set — Original Case",
    description: "Complete Union-era proof set in original presentation. Soft cameo devices throughout.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.SILVER,
    year: 1952,
    denomination: "Proof Set",
    priceCents: 6_750_00,
    condition: "Proof / OGP",
    seller: "GOLD",
    photoIndex: 2,
    acceptsOffers: true,
    mintage: 3_500,
  },
  {
    taxonomy: "Union / Farthings",
    slug: "1938-union-farthing-raw-bu",
    title: "1938 Union Farthing — Raw BU Brown",
    description: "Glossy mint-state farthing with full red-brown cartwheel lustre.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.BRONZE,
    year: 1938,
    denomination: "1 Farthing",
    priceCents: 380_00,
    condition: "BU BN",
    seller: "SILVER",
    photoIndex: 3,
  },
  {
    taxonomy: "Union / Crowns",
    slug: "1948-union-crown-pcgs-ms63",
    title: "1948 Union Crown — PCGS MS63",
    description: "Bright white Union crown with only light contact marks.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.SILVER,
    year: 1948,
    denomination: "5 Shilling Crown",
    priceCents: 3_450_00,
    condition: "MS63",
    seller: "SILVER",
    photoIndex: 1,
    graded: { certificateId: "PCGS-SEED-UNION-CROWN-1948", provider: VerificationProvider.PCGS },
  },
  {
    taxonomy: "Union / Shillings",
    slug: "1924-union-shilling-sangs-vf35",
    title: "1924 Union Shilling — SANGS VF35",
    description: "Solid mid-grade Union shilling with even wear and residual lustre.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.SILVER,
    year: 1924,
    denomination: "1 Shilling",
    priceCents: 465_00,
    condition: "VF35",
    seller: "STANDARD",
    photoIndex: 0,
    graded: { certificateId: "SANGS-SEED-UNION-SHILLING-1924", provider: VerificationProvider.SANGS },
  },
  {
    taxonomy: "Union / Florins",
    slug: "1932-union-florin-raw",
    title: "1932 Union Florin (2 Shillings) — Raw XF",
    description: "Attractive Union florin with sharp peripheral legends.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.SILVER,
    year: 1932,
    denomination: "2 Shilling Florin",
    priceCents: 720_00,
    condition: "XF",
    seller: "SILVER",
    photoIndex: 3,
    acceptsOffers: true,
  },
  // —— 4× Republic ——
  {
    taxonomy: "Republic / 1c",
    slug: "1965-republic-1c-english-raw",
    title: "1965 Republic 1c English Legend — Raw UNC",
    description: "First-year Republic 1 cent with English legends. Full mint red remaining.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.BRONZE,
    year: 1965,
    denomination: "1c",
    priceCents: 45_00,
    condition: "UNC",
    seller: "STANDARD",
    photoIndex: 3,
  },
  {
    taxonomy: "Republic / 1c",
    slug: "1965-republic-1c-afrikaans-raw",
    title: "1965 Republic 1c Afrikaans Legend — Raw UNC",
    description: "Matching Afrikaans-legend 1 cent. Popular bilingual type pair companion.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.BRONZE,
    year: 1965,
    denomination: "1c",
    priceCents: 55_00,
    condition: "UNC",
    seller: "STANDARD",
    photoIndex: 4,
  },
  {
    taxonomy: "Sets / Natura Sets",
    slug: "2000-natura-set-ogp",
    title: "2000 Natura Proof Set — Original Packaging",
    description: "Complete Natura wildlife proof set in original SA Mint packaging with COA.",
    category: ListingCategory.COINS,
    listingType: ListingType.RAW,
    metal: PreciousMetal.SILVER,
    year: 2000,
    denomination: "Natura Set",
    priceCents: 8_900_00,
    condition: "Proof / OGP",
    seller: "GOLD",
    photoIndex: 2,
    acceptsOffers: true,
    isSponsored: true,
  },
  {
    taxonomy: "Republic / R2",
    slug: "1968-republic-r2-gold-ngc-ms65",
    title: "1968 Republic R2 Gold — NGC MS65",
    description: "Brilliant two-rand gold with sharp devices and orange-peel lustre.",
    category: ListingCategory.COINS,
    listingType: ListingType.GRADED,
    metal: PreciousMetal.GOLD,
    year: 1968,
    denomination: "R2",
    priceCents: 14_200_00,
    condition: "MS65",
    seller: "DEALER",
    photoIndex: 0,
    weightGrams: 7.988,
    purityPercent: 91.67,
    graded: { certificateId: "NGC-SEED-REPUBLIC-R2-1968", provider: VerificationProvider.NGC },
  },
  // —— 3× Bullion ——
  {
    taxonomy: "Bullion / Fractional Bullion",
    slug: "2023-fractional-gold-krugerrand-tenth",
    title: "2023 1/10oz Gold Krugerrand — BU",
    description: "Fractional tenth-ounce gold Krugerrand. Spot-linked Buy Now pricing.",
    category: ListingCategory.KRUGERRAND,
    listingType: ListingType.BULLION,
    metal: PreciousMetal.GOLD,
    year: 2023,
    denomination: "1/10 oz Gold Krugerrand",
    priceCents: 7_850_00,
    condition: "BU",
    seller: "DEALER",
    photoIndex: 0,
    weightGrams: 3.39,
    purityPercent: 91.67,
  },
  {
    taxonomy: "Bullion / Bars",
    slug: "2022-1oz-silver-bar-sa-mint",
    title: "1oz Fine Silver Bar — SA Mint Sealed",
    description: "Sealed one-ounce .999 silver bar. Ideal stacker inventory.",
    category: ListingCategory.BULLION,
    listingType: ListingType.BULLION,
    metal: PreciousMetal.SILVER,
    year: 2022,
    denomination: "1oz Silver Bar",
    priceCents: 980_00,
    condition: "Sealed",
    seller: "GOLD",
    photoIndex: 0,
    weightGrams: 31.1,
    purityPercent: 99.9,
  },
  {
    taxonomy: "Bullion / Gold Krugerrands",
    slug: "2021-1oz-gold-krugerrand-bu",
    title: "2021 1oz Gold Krugerrand — BU",
    description: "Standard one-ounce gold Krugerrand. High-ticket Buy Now for UI price formatting.",
    category: ListingCategory.KRUGERRAND,
    listingType: ListingType.BULLION,
    metal: PreciousMetal.GOLD,
    year: 2021,
    denomination: "1oz Gold Krugerrand",
    priceCents: 185_000_00,
    condition: "BU",
    seller: "DEALER",
    photoIndex: 1,
    weightGrams: 33.93,
    purityPercent: 91.67,
    isSponsored: true,
  },
  // —— 3× Banknotes ——
  {
    taxonomy: "Banknotes / Vintage European",
    slug: "1923-german-notgeld-pair",
    title: "1923 German Notgeld Banknote Pair — Vintage European",
    description: "Colourful Weimar-era Notgeld pair. Attractive topical world paper.",
    category: ListingCategory.BANKNOTES,
    listingType: ListingType.RAW,
    metal: PreciousMetal.NOT_APPLICABLE,
    year: 1923,
    denomination: "Notgeld Pair",
    priceCents: 185_00,
    condition: "VF",
    seller: "STANDARD",
    photoIndex: 4,
    country: "Germany",
  },
  {
    taxonomy: "Banknotes / ZAR Notes",
    slug: "1900-zar-one-pound-note",
    title: "ZAR £1 Note — Zuid-Afrikaansche Republiek",
    description: "Scarce ZAR pound note with honest folds. Historic paper currency reference.",
    category: ListingCategory.BANKNOTES,
    listingType: ListingType.RAW,
    metal: PreciousMetal.NOT_APPLICABLE,
    year: 1900,
    denomination: "ZAR £1 Note",
    priceCents: 12_500_00,
    condition: "Fine",
    seller: "SILVER",
    photoIndex: 4,
    acceptsOffers: true,
  },
  {
    taxonomy: "Banknotes / Republic Notes",
    slug: "1985-r10-jan-van-riebeeck-note",
    title: "1980s R10 Jan van Riebeeck Note — UNC",
    description: "Crisp Republic-era R10 with Jan van Riebeeck portrait. No folds.",
    category: ListingCategory.BANKNOTES,
    listingType: ListingType.RAW,
    metal: PreciousMetal.NOT_APPLICABLE,
    year: 1985,
    denomination: "R10 Note",
    priceCents: 95_00,
    condition: "UNC",
    seller: "STANDARD",
    photoIndex: 4,
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
    isCoinClubMember: spec.isCoinClubMember,
    completedSalesCount: spec.completedSalesCount,
    subscriptionTier: spec.tier,
  };
  const user = await db.user.upsert({
    where: { email: spec.email },
    update: {
      ...profile,
      passwordHash,
    },
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

async function createListing(opts: FixedSeed & { sellerId: string }) {
  const images = [photo(opts.photoIndex)];
  const eraSubcategory =
    opts.year >= 1852 && opts.year <= 1902
      ? "zar"
      : opts.year >= 1923 && opts.year <= 1960
        ? "union"
        : opts.year >= 1961 && opts.year <= 1964
          ? "first-decimal"
          : opts.year >= 1965 && opts.year <= 1988
            ? "second-decimal"
            : opts.year >= 1989 && opts.year <= 2022
              ? "third-decimal"
              : opts.year >= 2023
                ? "fourth-decimal"
                : opts.taxonomy.toLowerCase().startsWith("bullion")
                  ? "bullion"
                  : opts.taxonomy.toLowerCase().startsWith("sets")
                    ? "sets"
                    : opts.taxonomy.toLowerCase().startsWith("banknotes")
                      ? "banknotes"
                      : null;

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
      isFeatured: opts.isSponsored ?? false,
      subcategory: eraSubcategory,
      images,
      coverImageUrl: images[0],
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
  if (LIVE_AUCTIONS.length !== 10) throw new Error(`Expected 10 auctions, got ${LIVE_AUCTIONS.length}`);
  if (FIXED_LISTINGS.length !== 20) throw new Error(`Expected 20 fixed listings, got ${FIXED_LISTINGS.length}`);

  const usersByKey: Record<SellerKey, { id: string; email: string; name: string | null }> = {
    DEALER: { id: "", email: "", name: null },
    GOLD: { id: "", email: "", name: null },
    SILVER: { id: "", email: "", name: null },
    STANDARD: { id: "", email: "", name: null },
  };

  for (const spec of MOCK_USERS) {
    const user = await ensureUser(spec);
    usersByKey[spec.key] = user;
    console.log(`User ready: ${spec.name} (${spec.tier})`);
  }

  await clearMarketplaceInventory();

  const now = Date.now();
  const bidders = [usersByKey.STANDARD, usersByKey.SILVER, usersByKey.GOLD, usersByKey.DEALER];

  console.log(`Seeding ${LIVE_AUCTIONS.length} live auctions…`);
  for (const item of LIVE_AUCTIONS) {
    const seller = usersByKey[item.seller];
    const currentBid = item.bids[item.bids.length - 1] ?? null;
    const currentBidder = currentBid != null ? bidders[(item.bids.length - 1) % bidders.length] : null;

    const auction = await db.auction.create({
      data: {
        sellerId: seller.id,
        title: item.title,
        description: item.description,
        images: [photo(item.photoIndex), photo(item.photoIndex + 1)],
        category: item.category,
        metal: item.metal,
        startingPriceCents: item.startingPriceCents,
        bidIncrementCents: item.bidIncrementCents,
        reservePriceCents: item.reservePriceCents,
        isReserveMet:
          item.reservePriceCents == null
            ? true
            : currentBid != null && currentBid >= item.reservePriceCents,
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
          maxBidCents: item.bids[i]!,
          createdAt: new Date(now - (item.bids.length - i) * 40 * 60 * 1000),
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
      sellerId: usersByKey[item.seller].id,
    });
    if (item.isSponsored) featuredListingId = listing.id;
  }

  if (featuredListingId) {
    await db.adPlacement.create({
      data: {
        slotType: "HOMEPAGE_HERO",
        slotPosition: 1,
        listingId: featuredListingId,
        advertiserId: usersByKey.DEALER.id,
        imageUrl: photo(1),
        targetUrl: "/auctions",
        priceCents: 25_000,
        startsAt: new Date(),
        endsAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });
  }

  await db.wantedItem.create({
    data: {
      userId: usersByKey.SILVER.id,
      eraCategory: "Union",
      targetYear: 1931,
      minimumGrade: "MS60",
      budgetCents: 5_000_00,
      notes: "Looking for a 1931 Union Farthing — prefer NGC or PCGS.",
      status: "OPEN",
    },
  });

  const listingCount = await db.listing.count({ where: { status: "ACTIVE" } });
  const auctionCount = await db.auction.count({ where: { status: "LIVE" } });

  console.log(
    JSON.stringify(
      {
        users: MOCK_USERS.map((u) => ({
          name: u.name,
          email: u.email,
          tier: u.tier,
          isSaandDealer: u.isSaandDealer,
        })),
        password: DEMO_PASSWORD,
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
