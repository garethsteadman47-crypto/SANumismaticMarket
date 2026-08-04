import { ListingCategory, ListingType, PreciousMetal, Prisma } from "@prisma/client";

/**
 * Collector-facing browse taxonomy for `/listings`. Broad parents with
 * nested denomination sub-categories — predicates map onto Listing fields
 * without reshaping the Prisma enum.
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

function child(
  id: string,
  label: string,
  keywordsAny: string[],
  extras: Partial<TaxonomyPredicate> & { icon?: TaxonomyIconName } = {},
): TaxonomyNode {
  const { icon = "Coins", ...predicate } = extras;
  return { id, label, icon, predicate: { keywordsAny, ...predicate } };
}

export const TAXONOMY_TREE: TaxonomyNode[] = [
  {
    id: "zar",
    label: "ZAR",
    icon: "Coins",
    predicate: { categories: [ListingCategory.COINS], minYear: 1874, maxYear: 1902 },
    children: [
      child("zar-veldpond", "Veldpond", ["veldpond"], { metals: [PreciousMetal.GOLD], icon: "Gem" }),
      child("zar-ponde", "Ponde", ["pond", "ponde"], { metals: [PreciousMetal.GOLD], icon: "Gem" }),
      child("zar-half-ponde", "Half Ponde", ["half pond", "half ponde"], {
        metals: [PreciousMetal.GOLD],
        icon: "Gem",
      }),
      child("zar-crowns", "Crowns (5 Shillings)", ["crown", "5 shilling", "5s"], {
        metals: [PreciousMetal.SILVER],
        icon: "Award",
      }),
      child("zar-half-crowns", "Half Crowns (2.5 Shillings)", ["half crown", "2.5 shilling", "2/6"], {
        metals: [PreciousMetal.SILVER],
        icon: "CircleDollarSign",
      }),
      child("zar-florins", "Florins (2 Shillings)", ["florin", "2 shilling", "2s"], {
        metals: [PreciousMetal.SILVER],
        icon: "CircleDollarSign",
      }),
      child("zar-shillings", "Shillings", ["shilling", "1s"], {
        metals: [PreciousMetal.SILVER],
        icon: "CircleDollarSign",
      }),
      child("zar-sixpences", "Sixpences (6d)", ["sixpence", "6d", "6 pence"], {
        metals: [PreciousMetal.SILVER],
      }),
      child("zar-threepences", "Threepences (3d)", ["threepence", "3d", "3 pence", "tickey"], {
        metals: [PreciousMetal.SILVER],
      }),
      child("zar-pennies", "Pennies", ["penny", "pennies", "1d"], {
        metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
      }),
      child("zar-half-pennies", "Half Pennies", ["half penny", "halfpenny", "1/2d"], {
        metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
      }),
      child("zar-farthings", "Farthings", ["farthing"], {
        metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
      }),
    ],
  },
  {
    id: "union",
    label: "Union",
    icon: "Landmark",
    predicate: { categories: [ListingCategory.COINS], minYear: 1910, maxYear: 1960 },
    children: [
      child("union-crowns", "Crowns", ["crown", "5 shilling"], {
        metals: [PreciousMetal.SILVER],
        icon: "Award",
      }),
      child("union-half-crowns", "Half Crowns", ["half crown", "2/6"], {
        metals: [PreciousMetal.SILVER],
        icon: "CircleDollarSign",
      }),
      child("union-florins", "Florins", ["florin", "2 shilling"], {
        metals: [PreciousMetal.SILVER],
        icon: "CircleDollarSign",
      }),
      child("union-shillings", "Shillings", ["shilling"], {
        metals: [PreciousMetal.SILVER],
        icon: "CircleDollarSign",
      }),
      child("union-sixpences", "Sixpences", ["sixpence", "6d"], { metals: [PreciousMetal.SILVER] }),
      child("union-threepences", "Threepences", ["threepence", "3d", "tickey"], {
        metals: [PreciousMetal.SILVER],
      }),
      child("union-pennies", "Pennies", ["penny", "pennies"], {
        metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
      }),
      child("union-half-pennies", "Half Pennies", ["half penny", "halfpenny"], {
        metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
      }),
      child("union-farthings", "Farthings", ["farthing"], {
        metals: [PreciousMetal.COPPER, PreciousMetal.BRONZE],
      }),
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
      child("republic-r2", "R2", ["r2", "2 rand"]),
      child("republic-r1", "R1", ["r1", "1 rand"]),
      child("republic-r5", "R5", ["r5", "5 rand"]),
      child("republic-50c", "50c", ["50c", "50 cent"]),
      child("republic-20c", "20c", ["20c", "20 cent"]),
      child("republic-10c", "10c", ["10c", "10 cent"]),
      child("republic-5c", "5c", ["5c", "5 cent"]),
      child("republic-2c", "2c", ["2c", "2 cent"]),
      child("republic-1c", "1c", ["1c", "1 cent"]),
      child("republic-half-c", "1/2c", ["1/2c", "half cent", "0.5c"]),
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
      child(
        "bullion-silver-krugerrands",
        "Silver Krugerrands",
        ["silver krugerrand", "krugerrand"],
        { metals: [PreciousMetal.SILVER] },
      ),
      child("bullion-gold-krugerrands", "Gold Krugerrands", ["gold krugerrand", "krugerrand"], {
        metals: [PreciousMetal.GOLD],
        icon: "Gem",
      }),
      child(
        "bullion-fractional",
        "Fractional Bullion",
        ["1/2 oz", "1/4 oz", "1/10 oz", "fractional", "half ounce", "quarter ounce"],
        { icon: "Gem" },
      ),
      child("bullion-bars", "Bars", ["bar", "ingot", "cast bar"], { icon: "Package" }),
    ],
  },
  {
    id: "sets",
    label: "Sets",
    icon: "Layers",
    predicate: { keywordsAny: ["set", "proof set", "mint set", "wildlife", "natura", "protea"] },
    children: [
      child("sets-proof", "Proof Sets", ["proof set"], { icon: "Award" }),
      child("sets-mint", "Mint Sets", ["mint set", "uncirculated set"], { icon: "Layers" }),
      child("sets-wildlife", "Wildlife Series (Big Five)", ["wildlife", "buffalo", "leopard", "big five"], {
        icon: "Layers",
      }),
      child("sets-natura", "Natura Sets", ["natura"], { icon: "Award" }),
      child("sets-protea", "Protea Sets", ["protea"], { icon: "Award" }),
    ],
  },
  {
    id: "banknotes",
    label: "Banknotes",
    icon: "Banknote",
    predicate: { categories: [ListingCategory.BANKNOTES] },
    children: [
      child("banknotes-zar", "ZAR Notes", ["zar note", "zuid-afrikaansche", "kruger note"], {
        icon: "ScrollText",
        maxYear: 1910,
      }),
      child("banknotes-union", "Union Notes", ["union note", "reserve bank"], {
        icon: "Landmark",
        minYear: 1910,
        maxYear: 1961,
      }),
      child("banknotes-republic", "Republic Notes", ["republic note", "rand note", "r10", "r20", "r50", "r100", "r200"], {
        icon: "Banknote",
        minYear: 1961,
      }),
      child("banknotes-global-specimen", "Global Specimen", ["specimen"], {
        icon: "ScrollText",
        nonSouthAfrican: true,
      }),
      child("banknotes-vintage-european", "Vintage European", ["notgeld", "weimar", "european", "vintage"], {
        icon: "Landmark",
        nonSouthAfrican: true,
      }),
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
  for (const childNode of node.children ?? []) {
    FLAT_INDEX.set(childNode.id, { node: childNode, parent: node });
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
