import { ListingCategory, ListingType, PreciousMetal, Prisma } from "@prisma/client";

/**
 * Collector-facing browse taxonomy for `/listings`.
 * Primary coin eras follow exact South African historical periods; bullion,
 * sets, and banknotes remain as secondary marketplace sections.
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
  /** Exact subcategory ids (era or leaf) to match on Listing.subcategory. */
  subcategories?: string[];
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
  return { id, label, icon, predicate: { keywordsAny, subcategories: [id], ...predicate } };
}

const DECIMAL_DENOMS = [
  child("decimal-r2", "R2", ["r2", "2 rand"]),
  child("decimal-r1", "R1", ["r1", "1 rand"]),
  child("decimal-r5", "R5", ["r5", "5 rand"]),
  child("decimal-50c", "50c", ["50c", "50 cent"]),
  child("decimal-20c", "20c", ["20c", "20 cent"]),
  child("decimal-10c", "10c", ["10c", "10 cent"]),
  child("decimal-5c", "5c", ["5c", "5 cent"]),
  child("decimal-2c", "2c", ["2c", "2 cent"]),
  child("decimal-1c", "1c", ["1c", "1 cent"]),
  child("decimal-half-c", "1/2c", ["1/2c", "half cent", "0.5c"]),
];

/** Strict South African historical eras + secondary marketplace sections. */
export const TAXONOMY_TREE: TaxonomyNode[] = [
  {
    id: "zar",
    label: "ZAR (1852–1902)",
    icon: "Coins",
    predicate: {
      categories: [ListingCategory.COINS],
      minYear: 1852,
      maxYear: 1902,
      subcategories: ["zar"],
    },
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
    label: "Union of South Africa (1923–1960)",
    icon: "Landmark",
    predicate: {
      categories: [ListingCategory.COINS],
      minYear: 1923,
      maxYear: 1960,
      subcategories: ["union"],
    },
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
    id: "first-decimal",
    label: "First Decimal (1961–1964)",
    icon: "Landmark",
    predicate: {
      categories: [ListingCategory.COINS, ListingCategory.KRUGERRAND],
      minYear: 1961,
      maxYear: 1964,
      subcategories: ["first-decimal"],
    },
    children: DECIMAL_DENOMS.map((node) => ({
      ...node,
      id: `first-decimal-${node.id.replace("decimal-", "")}`,
      predicate: { ...node.predicate, subcategories: [`first-decimal-${node.id.replace("decimal-", "")}`] },
    })),
  },
  {
    id: "second-decimal",
    label: "Second Decimal (1965–1988)",
    icon: "Coins",
    predicate: {
      categories: [ListingCategory.COINS, ListingCategory.KRUGERRAND],
      minYear: 1965,
      maxYear: 1988,
      subcategories: ["second-decimal"],
    },
    children: DECIMAL_DENOMS.map((node) => ({
      ...node,
      id: `second-decimal-${node.id.replace("decimal-", "")}`,
      predicate: { ...node.predicate, subcategories: [`second-decimal-${node.id.replace("decimal-", "")}`] },
    })),
  },
  {
    id: "third-decimal",
    label: "Third Decimal (1989–2023)",
    icon: "Coins",
    predicate: {
      categories: [ListingCategory.COINS, ListingCategory.KRUGERRAND],
      minYear: 1989,
      maxYear: 2023,
      subcategories: ["third-decimal"],
    },
    children: DECIMAL_DENOMS.map((node) => ({
      ...node,
      id: `third-decimal-${node.id.replace("decimal-", "")}`,
      predicate: { ...node.predicate, subcategories: [`third-decimal-${node.id.replace("decimal-", "")}`] },
    })),
  },
  {
    id: "fourth-decimal",
    label: "Fourth Decimal (2023–Current)",
    icon: "Coins",
    predicate: {
      categories: [ListingCategory.COINS, ListingCategory.KRUGERRAND],
      minYear: 2023,
      subcategories: ["fourth-decimal"],
    },
    children: DECIMAL_DENOMS.map((node) => ({
      ...node,
      id: `fourth-decimal-${node.id.replace("decimal-", "")}`,
      predicate: { ...node.predicate, subcategories: [`fourth-decimal-${node.id.replace("decimal-", "")}`] },
    })),
  },
  {
    id: "bullion",
    label: "Bullion",
    icon: "Gem",
    predicate: {
      categories: [ListingCategory.BULLION, ListingCategory.KRUGERRAND],
      listingTypes: [ListingType.BULLION, ListingType.RAW, ListingType.GRADED],
      subcategories: ["bullion"],
    },
    children: [
      child("bullion-silver-krugerrands", "Silver Krugerrands", ["silver krugerrand", "krugerrand"], {
        metals: [PreciousMetal.SILVER],
      }),
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
    predicate: {
      keywordsAny: ["set", "proof set", "mint set", "wildlife", "natura", "protea"],
      subcategories: ["sets"],
    },
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
    predicate: { categories: [ListingCategory.BANKNOTES], subcategories: ["banknotes"] },
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

/** The six strict historical coin eras (sidebar primary section). */
export const HISTORICAL_ERA_IDS = [
  "zar",
  "union",
  "first-decimal",
  "second-decimal",
  "third-decimal",
  "fourth-decimal",
] as const;

export type HistoricalEraId = (typeof HISTORICAL_ERA_IDS)[number];

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

/** Parent era id for a taxonomy node (itself if already a root). */
export function getTaxonomyParentId(id: string): string | undefined {
  const entry = getTaxonomyNode(id);
  if (!entry) return undefined;
  return entry.parent?.id ?? entry.node.id;
}

/** All subcategory ids under a taxonomy node (self + children for roots). */
export function getSubcategoryIdsForTaxonomy(id: string): string[] {
  const entry = getTaxonomyNode(id);
  if (!entry) return [id];
  if (!entry.parent) {
    return [id, ...(entry.node.children?.map((childNode) => childNode.id) ?? [])];
  }
  return [id];
}

/**
 * Infer the era subcategory id from a coin year (strict historical periods).
 * 2023 is assigned to Fourth Decimal when overlapping Third's end year.
 */
export function inferEraSubcategory(year: number | null | undefined): HistoricalEraId | null {
  if (year == null || !Number.isFinite(year)) return null;
  if (year >= 1852 && year <= 1902) return "zar";
  if (year >= 1923 && year <= 1960) return "union";
  if (year >= 1961 && year <= 1964) return "first-decimal";
  if (year >= 1965 && year <= 1988) return "second-decimal";
  if (year >= 1989 && year <= 2022) return "third-decimal";
  if (year >= 2023) return "fourth-decimal";
  return null;
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
    subcategories: b.subcategories ?? a.subcategories,
  };
}

export function resolveTaxonomyPredicate(id: string): TaxonomyPredicate | undefined {
  const entry = getTaxonomyNode(id);
  if (!entry) return undefined;
  if (!entry.parent) {
    return {
      ...entry.node.predicate,
      subcategories: getSubcategoryIdsForTaxonomy(id),
    };
  }
  return mergePredicates(
    { ...entry.parent.predicate, subcategories: getSubcategoryIdsForTaxonomy(entry.parent.id) },
    entry.node.predicate,
  );
}

export function buildTaxonomyListingWhere(predicate: TaxonomyPredicate): Prisma.ListingWhereInput {
  const clauses: Prisma.ListingWhereInput[] = [];

  const fieldWhere: Prisma.ListingWhereInput = {};
  if (predicate.categories?.length) {
    fieldWhere.category = { in: predicate.categories };
  }
  if (predicate.metals?.length) {
    fieldWhere.metal = { in: predicate.metals };
  }
  if (predicate.listingTypes?.length) {
    fieldWhere.listingType = { in: predicate.listingTypes };
  }
  if (predicate.minYear != null || predicate.maxYear != null) {
    fieldWhere.year = {
      ...(predicate.minYear != null ? { gte: predicate.minYear } : {}),
      ...(predicate.maxYear != null ? { lte: predicate.maxYear } : {}),
    };
  }
  if (predicate.nonSouthAfrican) {
    fieldWhere.country = { not: "South Africa" };
  }
  if (predicate.keywordsAny?.length) {
    fieldWhere.OR = predicate.keywordsAny.flatMap((keyword) => [
      { denomination: { contains: keyword, mode: "insensitive" as const } },
      { title: { contains: keyword, mode: "insensitive" as const } },
    ]);
  }

  if (Object.keys(fieldWhere).length > 0) {
    clauses.push(fieldWhere);
  }

  // Prefer exact subcategory matches when present — still OR'd with year/field
  // predicates so legacy rows without subcategory keep appearing.
  if (predicate.subcategories?.length) {
    clauses.push({ subcategory: { in: predicate.subcategories } });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { OR: clauses };
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
