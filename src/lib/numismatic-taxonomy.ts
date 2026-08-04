import { ListingCategory, ListingType, PreciousMetal, Prisma } from "@prisma/client";

/**
 * Collector-facing browse taxonomy for `/listings`. Broad parents with
 * nested sub-categories — predicates map onto Listing fields without
 * reshaping the Prisma enum.
 */

export type TaxonomyIconName =
  | "Landmark"
  | "Coins"
  | "CircleDollarSign"
  | "Banknote"
  | "Layers"
  | "Gem"
  | "Package"
  | "Award"
  | "ScrollText"
  | "AlertTriangle"
  | "Cat";

export interface TaxonomyPredicate {
  categories?: ListingCategory[];
  metals?: PreciousMetal[];
  listingTypes?: ListingType[];
  minYear?: number;
  maxYear?: number;
  keywordsAny?: string[];
  nonSouthAfrican?: boolean;
}

export interface TaxonomyNode {
  id: string;
  label: string;
  icon: TaxonomyIconName;
  predicate: TaxonomyPredicate;
  children?: TaxonomyNode[];
}

export const TAXONOMY_TREE: TaxonomyNode[] = [
  {
    id: "zar",
    label: "ZAR",
    icon: "Coins",
    predicate: { categories: [ListingCategory.COINS], minYear: 1874, maxYear: 1902 },
    children: [
      {
        id: "zar-ponde",
        label: "Ponde",
        icon: "Coins",
        predicate: { metals: [PreciousMetal.GOLD], keywordsAny: ["pond", "ponde", "veldpond"] },
      },
      {
        id: "zar-half-ponde",
        label: "Half Ponde",
        icon: "Coins",
        predicate: { metals: [PreciousMetal.GOLD], keywordsAny: ["half pond", "half ponde"] },
      },
      {
        id: "zar-pennies",
        label: "Pennies",
        icon: "Coins",
        predicate: {
          metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
          keywordsAny: ["penny", "pennies"],
        },
      },
    ],
  },
  {
    id: "union",
    label: "Union",
    icon: "Landmark",
    predicate: { categories: [ListingCategory.COINS], minYear: 1910, maxYear: 1960 },
    children: [
      {
        id: "union-shillings",
        label: "Shillings",
        icon: "CircleDollarSign",
        predicate: { metals: [PreciousMetal.SILVER], keywordsAny: ["shilling", "florin", "half crown"] },
      },
      {
        id: "union-farthings",
        label: "Farthings",
        icon: "Coins",
        predicate: {
          metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
          keywordsAny: ["farthing"],
        },
      },
      {
        id: "union-crowns",
        label: "Crowns",
        icon: "Award",
        predicate: { metals: [PreciousMetal.SILVER], keywordsAny: ["crown", "5 shilling"] },
      },
    ],
  },
  {
    id: "republic",
    label: "Republic",
    icon: "Landmark",
    predicate: {
      categories: [ListingCategory.COINS, ListingCategory.KRUGERRAND],
      minYear: 1961,
    },
    children: [
      {
        id: "republic-r1",
        label: "R1",
        icon: "Coins",
        predicate: { keywordsAny: ["r1", "1 rand"] },
      },
      {
        id: "republic-r2",
        label: "R2",
        icon: "Coins",
        predicate: { keywordsAny: ["r2", "2 rand"] },
      },
      {
        id: "republic-fractional",
        label: "Fractional",
        icon: "Gem",
        predicate: {
          keywordsAny: ["1/2 oz", "1/4 oz", "1/10 oz", "fractional", "half ounce", "quarter ounce"],
        },
      },
    ],
  },
  {
    id: "bullion",
    label: "Bullion",
    icon: "Gem",
    predicate: {
      categories: [ListingCategory.BULLION, ListingCategory.KRUGERRAND],
      listingTypes: [ListingType.BULLION, ListingType.RAW, ListingType.GRADED],
    },
    children: [
      {
        id: "bullion-silver-krugerrands",
        label: "Silver Krugerrands",
        icon: "Coins",
        predicate: {
          metals: [PreciousMetal.SILVER],
          keywordsAny: ["krugerrand", "silver krugerrand"],
        },
      },
      {
        id: "bullion-gold",
        label: "Gold",
        icon: "Gem",
        predicate: { metals: [PreciousMetal.GOLD] },
      },
      {
        id: "bullion-bars",
        label: "Bars",
        icon: "Package",
        predicate: { keywordsAny: ["bar", "ingot", "cast bar"] },
      },
    ],
  },
  {
    id: "sets",
    label: "Sets",
    icon: "Layers",
    predicate: { keywordsAny: ["set", "proof set", "double coin", "wildlife"] },
    children: [
      {
        id: "sets-wildlife",
        label: "Wildlife",
        icon: "Layers",
        predicate: { keywordsAny: ["wildlife", "buffalo", "leopard", "big five"] },
      },
      {
        id: "sets-commemoratives",
        label: "Commemoratives",
        icon: "Award",
        predicate: { keywordsAny: ["commemorative"] },
      },
      {
        id: "sets-proof",
        label: "Proof Sets",
        icon: "Award",
        predicate: { keywordsAny: ["proof set"] },
      },
      {
        id: "sets-double",
        label: "Double Sets",
        icon: "Layers",
        predicate: { keywordsAny: ["double coin", "double set"] },
      },
    ],
  },
  {
    id: "banknotes",
    label: "Banknotes",
    icon: "Banknote",
    predicate: { categories: [ListingCategory.BANKNOTES] },
    children: [
      {
        id: "banknotes-specimen",
        label: "Specimen",
        icon: "ScrollText",
        predicate: { keywordsAny: ["specimen"] },
      },
      {
        id: "banknotes-vintage",
        label: "Vintage",
        icon: "Landmark",
        predicate: { keywordsAny: ["notgeld", "vintage", "weimar", "emergency"] },
      },
      {
        id: "banknotes-global",
        label: "Global",
        icon: "Banknote",
        predicate: { nonSouthAfrican: true },
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
  return entry.parent ? `${entry.parent.label} / ${entry.node.label}` : entry.node.label;
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

export function resolveTaxonomyPredicate(id: string): TaxonomyPredicate | undefined {
  const entry = getTaxonomyNode(id);
  if (!entry) return undefined;
  if (!entry.parent) return entry.node.predicate;
  return mergePredicates(entry.parent.predicate, entry.node.predicate);
}

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
