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

export type TaxonomyIconName =
  | "Landmark"
  | "Coins"
  | "CircleDollarSign"
  | "Banknote"
  | "Layers"
  | "ShieldAlert"
  | "Deer"
  | "Gem"
  | "Package"
  | "Award"
  | "Globe"
  | "ScrollText"
  | "Buffalo"
  | "Cat"
  | "AlertTriangle";

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
  /** Lucide-oriented icon key rendered by CategoryTree (no emoji). */
  icon: TaxonomyIconName;
  predicate: TaxonomyPredicate;
  children?: TaxonomyNode[];
}

export const TAXONOMY_TREE: TaxonomyNode[] = [
  {
    id: "zar-union",
    label: "South African ZAR & Union",
    icon: "Landmark",
    predicate: { categories: [ListingCategory.COINS], minYear: 1874, maxYear: 1960 },
    children: [
      {
        id: "zar-ponde",
        label: "Ponde",
        icon: "Coins",
        predicate: { metals: [PreciousMetal.GOLD], keywordsAny: ["pond", "ponde"], maxYear: 1902 },
      },
      {
        id: "zar-half-ponde",
        label: "Half Ponde",
        icon: "Coins",
        predicate: { metals: [PreciousMetal.GOLD], keywordsAny: ["half pond", "half ponde"], maxYear: 1902 },
      },
      {
        id: "zar-shillings",
        label: "Shillings",
        icon: "CircleDollarSign",
        predicate: {
          metals: [PreciousMetal.SILVER, PreciousMetal.NICKEL],
          keywordsAny: ["shilling", "florin", "half crown", "crown"],
        },
      },
      {
        id: "zar-pennies",
        label: "Pennies",
        icon: "Coins",
        predicate: {
          metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
          keywordsAny: ["penny", "pennies", "half penny"],
        },
      },
      {
        id: "zar-farthings",
        label: "Farthings",
        icon: "Coins",
        predicate: {
          metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
          keywordsAny: ["farthing"],
        },
      },
    ],
  },
  {
    id: "republic",
    label: "South African Republic & Bullion",
    icon: "Gem",
    predicate: {
      categories: [ListingCategory.COINS, ListingCategory.KRUGERRAND, ListingCategory.BULLION],
      minYear: 1961,
    },
    children: [
      {
        id: "republic-silver-krugerrands",
        label: "Silver Krugerrands",
        icon: "Coins",
        predicate: {
          categories: [ListingCategory.KRUGERRAND, ListingCategory.COINS],
          metals: [PreciousMetal.SILVER],
          keywordsAny: ["krugerrand", "silver krugerrand"],
        },
      },
      {
        id: "republic-commemorative",
        label: "Commemorative R1 & R2 Silver Coins",
        icon: "Award",
        predicate: {
          categories: [ListingCategory.COINS],
          metals: [PreciousMetal.SILVER],
          keywordsAny: ["r1", "r2", "commemorative"],
        },
      },
      {
        id: "republic-fractional",
        label: "Fractional Bullion",
        icon: "Gem",
        predicate: {
          categories: [ListingCategory.BULLION, ListingCategory.KRUGERRAND],
          listingTypes: [ListingType.BULLION],
          keywordsAny: ["1/2 oz", "1/4 oz", "1/10 oz", "fractional", "half ounce", "quarter ounce"],
        },
      },
      {
        id: "republic-uncirculated",
        label: "Uncirculated Stock",
        icon: "Package",
        predicate: {
          listingTypes: [ListingType.RAW, ListingType.BULLION],
          keywordsAny: ["uncirculated", "bu", "brilliant uncirculated", "mint state"],
        },
      },
    ],
  },
  {
    id: "banknotes",
    label: "Global & International Banknotes",
    icon: "Banknote",
    predicate: {
      categories: [ListingCategory.BANKNOTES],
      nonSouthAfrican: true,
    },
    children: [
      {
        id: "banknotes-specimen",
        label: "Global Specimen Notes",
        icon: "ScrollText",
        predicate: { keywordsAny: ["specimen", "cuban", "belarusian", "cuba", "belarus"] },
      },
      {
        id: "banknotes-european",
        label: "Vintage European",
        icon: "Landmark",
        predicate: { keywordsAny: ["notgeld", "german", "european", "weimar"] },
      },
    ],
  },
  {
    id: "sets-wildlife",
    label: "Sets, Wildlife & Varieties",
    icon: "Layers",
    predicate: {
      keywordsAny: ["set", "big five", "buffalo", "leopard", "error", "variety", "proof set"],
    },
    children: [
      {
        id: "sets-buffalo",
        label: "Big Five Buffalo Double Coin Sets",
        icon: "Layers",
        predicate: { keywordsAny: ["buffalo", "big five buffalo", "double coin"] },
      },
      {
        id: "sets-leopard",
        label: "Silver Leopard Sets",
        icon: "Cat",
        predicate: { keywordsAny: ["leopard", "silver leopard"] },
      },
      {
        id: "sets-proof",
        label: "Vintage Proof Sets",
        icon: "Award",
        predicate: { keywordsAny: ["proof set", "union proof", "sa proof"] },
      },
      {
        id: "errors-coins",
        label: "Error Coins",
        icon: "AlertTriangle",
        predicate: { keywordsAny: ["error", "clipped planchet", "die crack", "off-center", "variety"] },
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
