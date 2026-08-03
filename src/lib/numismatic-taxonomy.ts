import { ListingCategory, ListingType, PreciousMetal, Prisma } from "@prisma/client";

/**
 * A curated, collector-facing browse taxonomy for `/listings`, layered on
 * top of the existing flexible `Listing` schema (category/metal/year/
 * denomination/country) rather than replacing it.
 *
 * Why a separate layer instead of reshaping `ListingCategory`? The
 * requested tree mixes era, denomination, and bullion fraction — those
 * aren't naturally a single exclusive enum column, and `ListingCategory`
 * is already load-bearing across the homepage, `/category/[slug]`,
 * `ListingForm`, ad placements, and seed data. Recutting it would be a
 * high-risk, wide-blast-radius migration for what is fundamentally a
 * *browse/merchandising* concept. Instead, each node here declares a
 * `predicate` that's translated into a real Prisma `where` fragment
 * (`buildTaxonomyListingWhere`) — heuristic (denomination text matching),
 * but honest about it, and fully real filtering, not decoration.
 *
 * Selecting a parent applies its own predicate only; selecting a child
 * applies the parent's predicate AND the child's (children narrow, they
 * don't replace).
 */

export interface TaxonomyPredicate {
  categories?: ListingCategory[];
  metals?: PreciousMetal[];
  listingTypes?: ListingType[];
  minYear?: number;
  maxYear?: number;
  /** Matches if the denomination OR title contains any of these (case-insensitive). */
  keywordsAny?: string[];
  /** `country != "South Africa"` when true. */
  nonSouthAfrican?: boolean;
}

export interface TaxonomyNode {
  id: string;
  label: string;
  emoji: string;
  predicate: TaxonomyPredicate;
  children?: TaxonomyNode[];
}

export const TAXONOMY_TREE: TaxonomyNode[] = [
  {
    id: "zar",
    label: "South African ZAR (1874 – 1902)",
    emoji: "🇿🇦",
    predicate: { categories: [ListingCategory.COINS], minYear: 1874, maxYear: 1902 },
    children: [
      {
        id: "zar-ponde",
        label: "Ponde & Half Ponde",
        emoji: "🇿🇦",
        predicate: { metals: [PreciousMetal.GOLD], keywordsAny: ["pond"] },
      },
      {
        id: "zar-shillings",
        label: "Shillings, Pennies & Farthings",
        emoji: "🇿🇦",
        predicate: {
          metals: [PreciousMetal.SILVER, PreciousMetal.COPPER, PreciousMetal.BRONZE, PreciousMetal.NICKEL],
          keywordsAny: ["shilling", "penny", "pennies", "farthing"],
        },
      },
    ],
  },
  {
    id: "union",
    label: "South African Union (1910 – 1960)",
    emoji: "🏛️",
    predicate: { categories: [ListingCategory.COINS], minYear: 1910, maxYear: 1960 },
    children: [
      {
        id: "union-crowns",
        label: "Silver Crowns (5 Shillings)",
        emoji: "🏛️",
        predicate: { metals: [PreciousMetal.SILVER], keywordsAny: ["crown", "5 shilling"] },
      },
      {
        id: "union-halfcrowns",
        label: "Half Crowns, Florins & Shillings",
        emoji: "🏛️",
        predicate: { metals: [PreciousMetal.SILVER], keywordsAny: ["half crown", "florin", "shilling"] },
      },
      {
        id: "union-pennies",
        label: "Pennies, Half Pennies & Farthings",
        emoji: "🏛️",
        predicate: {
          metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE, PreciousMetal.NICKEL],
          keywordsAny: ["penny", "half penny", "farthing"],
        },
      },
    ],
  },
  {
    id: "republic",
    label: "South African Republic (1961 – Present)",
    emoji: "🦌",
    predicate: {
      categories: [ListingCategory.COINS, ListingCategory.KRUGERRAND, ListingCategory.BULLION],
      minYear: 1961,
    },
    children: [
      {
        id: "republic-krugerrands",
        label: "Gold Krugerrands (1 oz, 1/2 oz, 1/4 oz, 1/10 oz)",
        emoji: "🦌",
        predicate: { categories: [ListingCategory.KRUGERRAND], metals: [PreciousMetal.GOLD] },
      },
      {
        id: "republic-commemorative",
        label: "Commemorative R1 & R2 Silver Coins",
        emoji: "🦌",
        predicate: {
          categories: [ListingCategory.COINS],
          metals: [PreciousMetal.SILVER],
          keywordsAny: ["r1", "r2", "commemorative"],
        },
      },
      {
        id: "republic-bullion",
        label: "Fractional Bullion & Uncirculated Stock",
        emoji: "🦌",
        predicate: { categories: [ListingCategory.BULLION], listingTypes: [ListingType.BULLION, ListingType.RAW] },
      },
    ],
  },
  {
    id: "sets",
    label: "Sets & Collections",
    emoji: "🏆",
    predicate: { keywordsAny: ["set"] },
    children: [
      {
        id: "sets-proof",
        label: "Vintage Proof Sets",
        emoji: "🏆",
        predicate: { keywordsAny: ["proof set"] },
      },
      {
        id: "sets-mint",
        label: "Mint Sets",
        emoji: "🏆",
        predicate: { keywordsAny: ["mint set"] },
      },
    ],
  },
  {
    id: "errors",
    label: "Errors & Varieties",
    emoji: "⚠️",
    predicate: { keywordsAny: ["error", "clipped planchet", "die crack", "variety"] },
    children: [
      {
        id: "errors-strike",
        label: "Strike Errors, Clipped Planchets, Die Cracks",
        emoji: "⚠️",
        predicate: { keywordsAny: ["strike error", "clipped planchet", "die crack"] },
      },
    ],
  },
  {
    id: "world",
    label: "World Coins & Banknotes",
    emoji: "🌍",
    predicate: {
      categories: [ListingCategory.BANKNOTES, ListingCategory.COINS, ListingCategory.OTHER],
      nonSouthAfrican: true,
    },
    children: [
      {
        id: "world-european",
        label: "Vintage European (e.g. German Notgeld)",
        emoji: "🌍",
        predicate: { keywordsAny: ["notgeld", "german", "european"] },
      },
      {
        id: "world-specimen",
        label: "Global Specimen Notes (e.g. Cuban, Belarusian)",
        emoji: "🌍",
        predicate: { categories: [ListingCategory.BANKNOTES], keywordsAny: ["specimen", "cuban", "belarusian"] },
      },
    ],
  },
];

interface FlatEntry {
  node: TaxonomyNode;
  parent?: TaxonomyNode;
}

const FLAT_INDEX: Map<string, FlatEntry> = new Map();
for (const node of TAXONOMY_TREE) {
  FLAT_INDEX.set(node.id, { node });
  for (const child of node.children ?? []) {
    FLAT_INDEX.set(child.id, { node: child, parent: node });
  }
}

export function getTaxonomyNode(id: string): FlatEntry | undefined {
  return FLAT_INDEX.get(id);
}

export function getTaxonomyNodeLabel(id: string): string | undefined {
  const entry = getTaxonomyNode(id);
  if (!entry) return undefined;
  return entry.parent ? `${entry.parent.label} → ${entry.node.label}` : entry.node.label;
}

function mergePredicates(a: TaxonomyPredicate, b: TaxonomyPredicate): TaxonomyPredicate {
  return {
    categories: b.categories ?? a.categories,
    metals: b.metals ?? a.metals,
    listingTypes: b.listingTypes ?? a.listingTypes,
    minYear: b.minYear ?? a.minYear,
    maxYear: b.maxYear ?? a.maxYear,
    keywordsAny: b.keywordsAny ?? a.keywordsAny,
    nonSouthAfrican: b.nonSouthAfrican ?? a.nonSouthAfrican,
  };
}

/** Resolves the effective predicate for a node id — parent's predicate merged with (narrowed by) the child's own, if it's a child. */
export function resolveTaxonomyPredicate(id: string): TaxonomyPredicate | undefined {
  const entry = getTaxonomyNode(id);
  if (!entry) return undefined;
  if (!entry.parent) return entry.node.predicate;
  return mergePredicates(entry.parent.predicate, entry.node.predicate);
}

/** Converts a resolved predicate into a real Prisma `Listing.where` fragment. */
export function buildTaxonomyListingWhere(predicate: TaxonomyPredicate): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};

  if (predicate.categories?.length) {
    where.category = { in: predicate.categories };
  }
  if (predicate.metals?.length) {
    where.metal = { in: predicate.metals };
  }
  if (predicate.listingTypes?.length) {
    where.listingType = { in: predicate.listingTypes };
  }
  if (predicate.minYear != null || predicate.maxYear != null) {
    where.year = {
      ...(predicate.minYear != null ? { gte: predicate.minYear } : {}),
      ...(predicate.maxYear != null ? { lte: predicate.maxYear } : {}),
    };
  }
  if (predicate.nonSouthAfrican) {
    where.country = { not: "South Africa" };
  }
  if (predicate.keywordsAny?.length) {
    where.OR = predicate.keywordsAny.flatMap((keyword) => [
      { denomination: { contains: keyword, mode: "insensitive" as const } },
      { title: { contains: keyword, mode: "insensitive" as const } },
    ]);
  }

  return where;
}

/**
 * Auctions lack year/denomination/country fields, so only category + metal
 * narrow the taxonomy selection there — everything else is left unfiltered
 * for auctions rather than incorrectly excluding them.
 */
export function buildTaxonomyAuctionWhere(predicate: TaxonomyPredicate): Prisma.AuctionWhereInput {
  const where: Prisma.AuctionWhereInput = {};
  if (predicate.categories?.length) {
    where.category = { in: predicate.categories };
  }
  if (predicate.metals?.length) {
    where.metal = { in: predicate.metals };
  }
  return where;
}
