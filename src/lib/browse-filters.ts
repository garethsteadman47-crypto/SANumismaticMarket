import { PreciousMetal, Prisma, VerificationProvider } from "@prisma/client";

import { buildTaxonomyAuctionWhere, buildTaxonomyListingWhere, getTaxonomyNodeLabel, resolveTaxonomyPredicate } from "@/lib/numismatic-taxonomy";
import { randsToCents } from "@/lib/utils/currency";

/**
 * Parsing, Prisma `where`-clause construction, and active-filter-pill
 * bookkeeping for the `/listings` split-screen browse experience. Kept as
 * pure functions (no DB access) so the filter logic is directly unit
 * testable — `/listings/page.tsx` is the only caller that touches Prisma.
 */

export const CERTIFICATION_OPTIONS = ["NGC", "PCGS", "ANACS", "SA_MINT", "RAW"] as const;
export type CertificationOption = (typeof CERTIFICATION_OPTIONS)[number];
export const CERTIFICATION_LABELS: Record<CertificationOption, string> = {
  NGC: "NGC",
  PCGS: "PCGS",
  ANACS: "ANACS",
  SA_MINT: "SA Mint",
  RAW: "Ungraded / Raw",
};

export const GRADE_BRACKETS = ["MS", "AU", "XF", "VF", "FINE_BELOW"] as const;
export type GradeBracket = (typeof GRADE_BRACKETS)[number];
export const GRADE_BRACKET_LABELS: Record<GradeBracket, string> = {
  MS: "Proof / Mint State (MS60-70)",
  AU: "About Uncirculated (AU)",
  XF: "Extremely Fine (XF)",
  VF: "Very Fine (VF)",
  FINE_BELOW: "Fine and Below",
};
/** Grade-string prefixes (case-insensitive) that fall into each bracket. */
const GRADE_BRACKET_PREFIXES: Record<GradeBracket, string[]> = {
  MS: ["MS", "PF", "PR", "BU", "UNC"],
  AU: ["AU"],
  XF: ["XF", "EF"],
  VF: ["VF"],
  FINE_BELOW: ["F", "VG", "G", "AG", "FR", "PO"],
};

export const METAL_BUCKETS = ["GOLD", "SILVER", "PLATINUM", "COPPER_BRONZE", "NICKEL_STEEL"] as const;
export type MetalBucket = (typeof METAL_BUCKETS)[number];
export const METAL_BUCKET_LABELS: Record<MetalBucket, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  PLATINUM: "Platinum",
  COPPER_BRONZE: "Copper / Bronze",
  NICKEL_STEEL: "Nickel / Steel",
};
const METAL_BUCKET_VALUES: Record<MetalBucket, PreciousMetal[]> = {
  GOLD: [PreciousMetal.GOLD],
  SILVER: [PreciousMetal.SILVER],
  PLATINUM: [PreciousMetal.PLATINUM],
  COPPER_BRONZE: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
  NICKEL_STEEL: [PreciousMetal.NICKEL, PreciousMetal.STEEL],
};

export const BUYING_FORMATS = ["BUY_NOW", "OFFERS", "AUCTION"] as const;
export type BuyingFormat = (typeof BUYING_FORMATS)[number];
export const BUYING_FORMAT_LABELS: Record<BuyingFormat, string> = {
  BUY_NOW: "Buy Now",
  OFFERS: "Accepting Offers",
  AUCTION: "Live Auctions",
};

/** Coins vs banknotes item-type facet (applies across all taxonomy categories). */
export const ITEM_TYPES = ["COINS", "BANKNOTES"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  COINS: "Coins",
  BANKNOTES: "Banknotes",
};

export const BROWSE_SORTS = ["newest", "price_asc", "price_desc", "ending_soon"] as const;
export type BrowseSort = (typeof BROWSE_SORTS)[number];
export const BROWSE_SORT_LABELS: Record<BrowseSort, string> = {
  newest: "Newest Arrivals",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  ending_soon: "Ending Soonest",
};

export interface BrowseFilterState {
  taxonomy?: string;
  /** Free-text catalogue search from the hero / browse search bar. */
  q?: string;
  certifications: CertificationOption[];
  gradeBrackets: GradeBracket[];
  metals: MetalBucket[];
  minYear?: number;
  maxYear?: number;
  minPriceRands?: number;
  maxPriceRands?: number;
  formats: BuyingFormat[];
  /** Coins vs Banknotes toggle — empty means both. */
  itemType?: ItemType;
  /** Restrict to verified dealers / Silver+ / Gold sellers. */
  verifiedOnly?: boolean;
  /** Grid sort — defaults applied per tab in the browse UI. */
  sort?: BrowseSort;
  /** 1-based page index for server-side pagination. */
  page?: number;
}

export const BROWSE_PAGE_SIZE = 24;

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseCsv<T extends string>(value: string | undefined, allowed: readonly T[]): T[] {
  if (!value) return [];
  const set = new Set(allowed as readonly string[]);
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is T => set.has(v));
}

function parseIntParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Homepage quick-nav and marketing deep-links historically used
 * `?category=…`. The browse sidebar speaks `?taxonomy=…` (see
 * `numismatic-taxonomy.ts`). Accept both, and remap a few friendly
 * short names (bullion/sets) onto the real taxonomy node ids.
 */
const CATEGORY_TO_TAXONOMY: Record<string, string> = {
  zar: "zar",
  "zar-union": "zar",
  union: "union",
  republic: "first-decimal",
  "first-decimal": "first-decimal",
  "second-decimal": "second-decimal",
  "third-decimal": "third-decimal",
  "fourth-decimal": "fourth-decimal",
  bullion: "bullion",
  banknotes: "banknotes",
  sets: "sets",
  "sets-wildlife": "sets-wildlife",
  international: "international",
  "intl-great-britain": "intl-great-britain",
  "intl-united-states": "intl-united-states",
  "intl-germany-notgeld": "intl-germany-notgeld",
  "intl-belarus": "intl-belarus",
  "intl-cuba": "intl-cuba",
  "intl-rest-of-world": "intl-rest-of-world",
};

function resolveTaxonomyParam(searchParams: RawSearchParams): string | undefined {
  const raw = firstString(searchParams.taxonomy) || firstString(searchParams.category);
  if (!raw) return undefined;
  return CATEGORY_TO_TAXONOMY[raw] ?? raw;
}

export function parseBrowseFilters(searchParams: RawSearchParams): BrowseFilterState {
  const q = firstString(searchParams.q)?.trim();
  const sortRaw = firstString(searchParams.sort);
  const sort = sortRaw && (BROWSE_SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as BrowseSort) : undefined;
  const pageRaw = parseIntParam(firstString(searchParams.page));
  const page = pageRaw != null && pageRaw > 0 ? pageRaw : 1;
  const itemTypeRaw = firstString(searchParams.itemType)?.toUpperCase();
  const itemType =
    itemTypeRaw && (ITEM_TYPES as readonly string[]).includes(itemTypeRaw) ? (itemTypeRaw as ItemType) : undefined;
  const verifiedRaw = firstString(searchParams.verifiedOnly)?.toLowerCase();
  const verifiedOnly = verifiedRaw === "true" || verifiedRaw === "1" || verifiedRaw === "yes";
  return {
    taxonomy: resolveTaxonomyParam(searchParams),
    q: q || undefined,
    certifications: parseCsv(firstString(searchParams.cert), CERTIFICATION_OPTIONS),
    gradeBrackets: parseCsv(firstString(searchParams.grade), GRADE_BRACKETS),
    metals: parseCsv(firstString(searchParams.metal), METAL_BUCKETS),
    minYear: parseIntParam(firstString(searchParams.minYear)),
    maxYear: parseIntParam(firstString(searchParams.maxYear)),
    minPriceRands: parseIntParam(firstString(searchParams.minPrice)),
    maxPriceRands: parseIntParam(firstString(searchParams.maxPrice)),
    formats: parseCsv(firstString(searchParams.format), BUYING_FORMATS),
    itemType,
    verifiedOnly: verifiedOnly || undefined,
    sort,
    page,
  };
}

/** Default sort for the active browse mode when `sort` is unset in the URL. */
export function resolveBrowseSort(filters: BrowseFilterState): BrowseSort {
  if (filters.sort) return filters.sort;
  const auctionOnly = filters.formats.length === 1 && filters.formats[0] === "AUCTION";
  return auctionOnly ? "ending_soon" : "newest";
}

/** Builds the query string for a given filter state — used for pill hrefs and the sidebar's own navigation. */
export function serializeBrowseFilters(filters: BrowseFilterState): string {
  const params = new URLSearchParams();
  if (filters.taxonomy) {
    params.set("taxonomy", filters.taxonomy);
    params.set("category", filters.taxonomy);
  }
  if (filters.q) params.set("q", filters.q);
  if (filters.certifications.length) params.set("cert", filters.certifications.join(","));
  if (filters.gradeBrackets.length) params.set("grade", filters.gradeBrackets.join(","));
  if (filters.metals.length) params.set("metal", filters.metals.join(","));
  if (filters.minYear != null) params.set("minYear", String(filters.minYear));
  if (filters.maxYear != null) params.set("maxYear", String(filters.maxYear));
  if (filters.minPriceRands != null) params.set("minPrice", String(filters.minPriceRands));
  if (filters.maxPriceRands != null) params.set("maxPrice", String(filters.maxPriceRands));
  if (filters.formats.length) params.set("format", filters.formats.join(","));
  if (filters.itemType) params.set("itemType", filters.itemType);
  if (filters.verifiedOnly) params.set("verifiedOnly", "true");
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page != null && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

/** Prisma orderBy: featured first within the active filter, then the user's sort. */
export function buildListingOrderBy(sort: BrowseSort): Prisma.ListingOrderByWithRelationInput[] {
  const featuredFirst: Prisma.ListingOrderByWithRelationInput = { isFeatured: "desc" };
  switch (sort) {
    case "price_asc":
      return [featuredFirst, { priceCents: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [featuredFirst, { priceCents: "desc" }, { createdAt: "desc" }];
    case "ending_soon":
      return [featuredFirst, { createdAt: "asc" }];
    case "newest":
    default:
      return [featuredFirst, { createdAt: "desc" }];
  }
}

export function buildAuctionOrderBy(sort: BrowseSort): Prisma.AuctionOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ startingPriceCents: "asc" }, { endsAt: "asc" }];
    case "price_desc":
      return [{ startingPriceCents: "desc" }, { endsAt: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "ending_soon":
    default:
      return [{ endsAt: "asc" }];
  }
}

export function isAnyFilterActive(filters: BrowseFilterState): boolean {
  return Boolean(
    filters.taxonomy ||
      filters.q ||
      filters.certifications.length ||
      filters.gradeBrackets.length ||
      filters.metals.length ||
      filters.minYear != null ||
      filters.maxYear != null ||
      filters.minPriceRands != null ||
      filters.maxPriceRands != null ||
      filters.formats.length ||
      filters.itemType ||
      filters.verifiedOnly
  );
}

function shouldIncludeListings(filters: BrowseFilterState): boolean {
  return filters.formats.length === 0 || filters.formats.includes("BUY_NOW") || filters.formats.includes("OFFERS");
}

export function shouldIncludeAuctions(filters: BrowseFilterState): boolean {
  return filters.formats.length === 0 || filters.formats.includes("AUCTION");
}

/**
 * Builds the full `Listing.where` clause for the current filter state, or
 * `null` if the selected Buying Format(s) exclude fixed-price listings
 * entirely (i.e. only "Live Auctions" is checked).
 */
export function buildListingWhere(filters: BrowseFilterState): Prisma.ListingWhereInput | null {
  if (!shouldIncludeListings(filters)) return null;

  const and: Prisma.ListingWhereInput[] = [{ status: "ACTIVE" }];

  if (filters.taxonomy) {
    const predicate = resolveTaxonomyPredicate(filters.taxonomy);
    if (predicate) and.push(buildTaxonomyListingWhere(predicate));
  }

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { denomination: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  const certOr: Prisma.ListingWhereInput[] = [];
  const providerValues = filters.certifications.filter((c): c is Exclude<CertificationOption, "RAW"> => c !== "RAW");
  if (providerValues.length) {
    certOr.push({ verification: { is: { provider: { in: providerValues as VerificationProvider[] } } } });
  }
  if (filters.certifications.includes("RAW")) {
    certOr.push({ verification: { is: null } });
  }
  if (certOr.length) and.push({ OR: certOr });

  if (filters.gradeBrackets.length) {
    const gradeOr = filters.gradeBrackets.flatMap((bracket) =>
      GRADE_BRACKET_PREFIXES[bracket].map((prefix) => ({ grade: { startsWith: prefix, mode: "insensitive" as const } }))
    );
    and.push({ verification: { is: { OR: gradeOr } } });
  }

  if (filters.metals.length) {
    const metalValues = filters.metals.flatMap((bucket) => METAL_BUCKET_VALUES[bucket]);
    and.push({ metal: { in: metalValues } });
  }

  if (filters.minYear != null || filters.maxYear != null) {
    and.push({
      year: {
        ...(filters.minYear != null ? { gte: filters.minYear } : {}),
        ...(filters.maxYear != null ? { lte: filters.maxYear } : {}),
      },
    });
  }

  if (filters.minPriceRands != null || filters.maxPriceRands != null) {
    and.push({
      priceCents: {
        ...(filters.minPriceRands != null ? { gte: randsToCents(filters.minPriceRands) } : {}),
        ...(filters.maxPriceRands != null ? { lte: randsToCents(filters.maxPriceRands) } : {}),
      },
    });
  }

  if (filters.formats.includes("OFFERS") && !filters.formats.includes("BUY_NOW")) {
    and.push({ acceptsOffers: true });
  }

  if (filters.itemType === "BANKNOTES") {
    and.push({ category: "BANKNOTES" });
  } else if (filters.itemType === "COINS") {
    and.push({ category: { not: "BANKNOTES" } });
  }

  if (filters.verifiedOnly) {
    and.push({
      seller: {
        is: {
          OR: [
            { isVerified: true },
            { subscriptionTier: { in: ["SILVER", "GOLD"] } },
          ],
        },
      },
    });
  }

  return { AND: and };
}

/**
 * Builds the `Auction.where` clause for the current filter state, or
 * `null` if auctions shouldn't be included at all (Buying Format excludes
 * "Live Auctions"). Certification / grade / year facets apply only to
 * fixed-price listings — they are ignored here so taxonomy filters still
 * return matching auctions on the Auction tab.
 */
export function buildAuctionWhere(filters: BrowseFilterState): Prisma.AuctionWhereInput | null {
  if (!shouldIncludeAuctions(filters)) return null;

  const and: Prisma.AuctionWhereInput[] = [{ status: { in: ["SCHEDULED", "LIVE"] } }];

  if (filters.taxonomy) {
    const predicate = resolveTaxonomyPredicate(filters.taxonomy);
    if (predicate) and.push(buildTaxonomyAuctionWhere(predicate));
  }

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  if (filters.metals.length) {
    const metalValues = filters.metals.flatMap((bucket) => METAL_BUCKET_VALUES[bucket]);
    and.push({ metal: { in: metalValues } });
  }

  // Effective price is the current bid if one exists, else the starting
  // price — approximate with an OR since Mongo/Prisma can't easily express
  // "coalesce(currentBidCents, startingPriceCents) BETWEEN x AND y" directly.
  if (filters.minPriceRands != null || filters.maxPriceRands != null) {
    const minCents = filters.minPriceRands != null ? randsToCents(filters.minPriceRands) : undefined;
    const maxCents = filters.maxPriceRands != null ? randsToCents(filters.maxPriceRands) : undefined;
    const range = { ...(minCents != null ? { gte: minCents } : {}), ...(maxCents != null ? { lte: maxCents } : {}) };
    and.push({
      OR: [
        { currentBidCents: range },
        { AND: [{ currentBidCents: null }, { startingPriceCents: range }] },
      ],
    });
  }

  if (filters.itemType === "BANKNOTES") {
    and.push({ category: "BANKNOTES" });
  } else if (filters.itemType === "COINS") {
    and.push({ category: { not: "BANKNOTES" } });
  }

  if (filters.verifiedOnly) {
    and.push({
      seller: {
        is: {
          OR: [
            { isVerified: true },
            { subscriptionTier: { in: ["SILVER", "GOLD"] } },
          ],
        },
      },
    });
  }

  return { AND: and };
}

export interface FilterPill {
  id: string;
  label: string;
  /** Query string to navigate to when this pill's "x" is clicked (this filter removed, everything else kept). */
  hrefQuery: string;
}

/** Computes the removable pill list for the current filter state. */
export function getActiveFilterPills(filters: BrowseFilterState): FilterPill[] {
  const pills: FilterPill[] = [];

  if (filters.taxonomy) {
    const label = getTaxonomyNodeLabel(filters.taxonomy) ?? filters.taxonomy;
    pills.push({ id: "taxonomy", label, hrefQuery: serializeBrowseFilters({ ...filters, taxonomy: undefined }) });
  }

  if (filters.q) {
    pills.push({
      id: "q",
      label: `“${filters.q}”`,
      hrefQuery: serializeBrowseFilters({ ...filters, q: undefined }),
    });
  }

  for (const cert of filters.certifications) {
    pills.push({
      id: `cert-${cert}`,
      label: CERTIFICATION_LABELS[cert],
      hrefQuery: serializeBrowseFilters({ ...filters, certifications: filters.certifications.filter((c) => c !== cert) }),
    });
  }

  for (const bracket of filters.gradeBrackets) {
    pills.push({
      id: `grade-${bracket}`,
      label: GRADE_BRACKET_LABELS[bracket],
      hrefQuery: serializeBrowseFilters({ ...filters, gradeBrackets: filters.gradeBrackets.filter((b) => b !== bracket) }),
    });
  }

  for (const metal of filters.metals) {
    pills.push({
      id: `metal-${metal}`,
      label: METAL_BUCKET_LABELS[metal],
      hrefQuery: serializeBrowseFilters({ ...filters, metals: filters.metals.filter((m) => m !== metal) }),
    });
  }

  for (const format of filters.formats) {
    pills.push({
      id: `format-${format}`,
      label: BUYING_FORMAT_LABELS[format],
      hrefQuery: serializeBrowseFilters({ ...filters, formats: filters.formats.filter((f) => f !== format) }),
    });
  }

  if (filters.itemType) {
    pills.push({
      id: "itemType",
      label: ITEM_TYPE_LABELS[filters.itemType],
      hrefQuery: serializeBrowseFilters({ ...filters, itemType: undefined }),
    });
  }

  if (filters.verifiedOnly) {
    pills.push({
      id: "verifiedOnly",
      label: "Verified Dealers Only",
      hrefQuery: serializeBrowseFilters({ ...filters, verifiedOnly: undefined }),
    });
  }

  if (filters.minYear != null || filters.maxYear != null) {
    pills.push({
      id: "year-range",
      label: `${filters.minYear ?? "…"}–${filters.maxYear ?? "…"}`,
      hrefQuery: serializeBrowseFilters({ ...filters, minYear: undefined, maxYear: undefined }),
    });
  }

  if (filters.minPriceRands != null || filters.maxPriceRands != null) {
    pills.push({
      id: "price-range",
      label: `R${filters.minPriceRands ?? 0} – R${filters.maxPriceRands ?? "∞"}`,
      hrefQuery: serializeBrowseFilters({ ...filters, minPriceRands: undefined, maxPriceRands: undefined }),
    });
  }

  return pills;
}
