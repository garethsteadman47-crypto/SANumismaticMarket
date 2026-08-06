import { describe, expect, it } from "vitest";

import type { Prisma } from "@prisma/client";

import {
  buildAuctionWhere,
  buildListingWhere,
  getActiveFilterPills,
  isAnyFilterActive,
  parseBrowseFilters,
  serializeBrowseFilters,
  shouldIncludeAuctions,
} from "./browse-filters";

function asArray(clauses: Prisma.ListingWhereInput["AND"]): Prisma.ListingWhereInput[] {
  if (!clauses) return [];
  return Array.isArray(clauses) ? clauses : [clauses];
}

describe("parseBrowseFilters", () => {
  it("returns empty defaults for no params", () => {
    const filters = parseBrowseFilters({});
    expect(filters).toEqual({
      taxonomy: undefined,
      q: undefined,
      certifications: [],
      gradeBrackets: [],
      metals: [],
      minYear: undefined,
      maxYear: undefined,
      minPriceRands: undefined,
      maxPriceRands: undefined,
      formats: [],
      sort: undefined,
      page: 1,
    });
  });

  it("parses comma-separated multi-value params", () => {
    const filters = parseBrowseFilters({ cert: "NGC,PCGS", metal: "GOLD,SILVER", format: "BUY_NOW,AUCTION" });
    expect(filters.certifications).toEqual(["NGC", "PCGS"]);
    expect(filters.metals).toEqual(["GOLD", "SILVER"]);
    expect(filters.formats).toEqual(["BUY_NOW", "AUCTION"]);
  });

  it("accepts homepage ?category= deep-links as taxonomy aliases", () => {
    expect(parseBrowseFilters({ category: "zar" }).taxonomy).toBe("zar");
    expect(parseBrowseFilters({ category: "bullion" }).taxonomy).toBe("bullion");
    expect(parseBrowseFilters({ category: "banknotes" }).taxonomy).toBe("banknotes");
    expect(parseBrowseFilters({ category: "sets" }).taxonomy).toBe("sets");
  });

  it("prefers taxonomy= over category= when both are present", () => {
    expect(parseBrowseFilters({ taxonomy: "banknotes", category: "bullion" }).taxonomy).toBe("banknotes");
  });

  it("silently drops unrecognized values instead of throwing", () => {
    const filters = parseBrowseFilters({ cert: "NGC,NOT_REAL", metal: "GOLD,BOGUS" });
    expect(filters.certifications).toEqual(["NGC"]);
    expect(filters.metals).toEqual(["GOLD"]);
  });

  it("parses numeric year/price params", () => {
    const filters = parseBrowseFilters({ minYear: "1874", maxYear: "1902", minPrice: "100", maxPrice: "5000" });
    expect(filters.minYear).toBe(1874);
    expect(filters.maxYear).toBe(1902);
    expect(filters.minPriceRands).toBe(100);
    expect(filters.maxPriceRands).toBe(5000);
  });

  it("handles array-shaped searchParams by taking the first value", () => {
    const filters = parseBrowseFilters({ cert: ["NGC,PCGS", "ignored"] });
    expect(filters.certifications).toEqual(["NGC", "PCGS"]);
  });
});

describe("serializeBrowseFilters + isAnyFilterActive round-trip", () => {
  it("round-trips through parse/serialize", () => {
    const original = parseBrowseFilters({
      taxonomy: "zar-ponde",
      cert: "NGC,PCGS",
      grade: "MS,AU",
      metal: "GOLD",
      minYear: "1874",
      maxYear: "1902",
      minPrice: "1000",
      maxPrice: "50000",
      format: "BUY_NOW",
    });
    const roundTripped = parseBrowseFilters(Object.fromEntries(new URLSearchParams(serializeBrowseFilters(original))));
    expect(roundTripped).toEqual(original);
  });

  it("reports no active filters for an empty state", () => {
    expect(isAnyFilterActive(parseBrowseFilters({}))).toBe(false);
  });

  it("reports active filters when any dimension is set", () => {
    expect(isAnyFilterActive(parseBrowseFilters({ metal: "GOLD" }))).toBe(true);
    expect(isAnyFilterActive(parseBrowseFilters({ minYear: "1900" }))).toBe(true);
  });
});

describe("buildListingWhere", () => {
  it("returns a base ACTIVE-status where clause with no filters", () => {
    const where = buildListingWhere(parseBrowseFilters({}));
    expect(where).toEqual({ AND: [{ status: "ACTIVE" }] });
  });

  it("returns null when only Live Auctions is selected as the buying format", () => {
    expect(buildListingWhere(parseBrowseFilters({ format: "AUCTION" }))).toBeNull();
  });

  it("still returns listings when Buy Now or Accepting Offers is selected alongside Auction", () => {
    expect(buildListingWhere(parseBrowseFilters({ format: "AUCTION,BUY_NOW" }))).not.toBeNull();
  });

  it("adds an acceptsOffers:true clause only when Offers is selected without Buy Now", () => {
    const where = buildListingWhere(parseBrowseFilters({ format: "OFFERS" }));
    expect(where?.AND).toContainEqual({ acceptsOffers: true });
  });

  it("combines certification providers and Raw via OR", () => {
    const where = buildListingWhere(parseBrowseFilters({ cert: "NGC,RAW" }));
    const orClause = asArray(where?.AND).find((clause) => "OR" in clause) as { OR: unknown[] } | undefined;
    expect(orClause?.OR).toContainEqual({ verification: { is: { provider: { in: ["NGC"] } } } });
    expect(orClause?.OR).toContainEqual({ verification: { is: null } });
  });

  it("maps a metal bucket to its underlying enum values", () => {
    const where = buildListingWhere(parseBrowseFilters({ metal: "COPPER_BRONZE" }));
    expect(where?.AND).toContainEqual({ metal: { in: ["COPPER", "BRONZE"] } });
  });

  it("applies a year range clause", () => {
    const where = buildListingWhere(parseBrowseFilters({ minYear: "1874", maxYear: "1902" }));
    expect(where?.AND).toContainEqual({ year: { gte: 1874, lte: 1902 } });
  });

  it("applies a price range clause converted to cents", () => {
    const where = buildListingWhere(parseBrowseFilters({ minPrice: "100", maxPrice: "500" }));
    expect(where?.AND).toContainEqual({ priceCents: { gte: 10000, lte: 50000 } });
  });

  it("merges in the taxonomy predicate when a node is selected, inheriting parent constraints", () => {
    const where = buildListingWhere(parseBrowseFilters({ taxonomy: "bullion-silver-krugerrands" }));
    const taxonomyClause = asArray(where?.AND).find(
      (clause) => clause && typeof clause === "object" && "OR" in clause,
    ) as { OR?: unknown[] } | undefined;
    expect(taxonomyClause?.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: { in: ["BULLION", "KRUGERRAND"] },
          metal: { in: ["SILVER"] },
        }),
        expect.objectContaining({
          subcategory: { in: ["bullion-silver-krugerrands"] },
        }),
      ]),
    );
  });
});

describe("buildAuctionWhere", () => {
  it("includes auctions with no filters active", () => {
    expect(shouldIncludeAuctions(parseBrowseFilters({}))).toBe(true);
    expect(buildAuctionWhere(parseBrowseFilters({}))).not.toBeNull();
  });

  it("excludes auctions when only Buy Now is selected", () => {
    expect(buildAuctionWhere(parseBrowseFilters({ format: "BUY_NOW" }))).toBeNull();
  });

  it("ignores certification/grade/year facets so taxonomy still returns auctions on the Auction tab", () => {
    expect(buildAuctionWhere(parseBrowseFilters({ cert: "NGC" }))).not.toBeNull();
    expect(buildAuctionWhere(parseBrowseFilters({ grade: "MS" }))).not.toBeNull();
    expect(buildAuctionWhere(parseBrowseFilters({ minYear: "1900" }))).not.toBeNull();
    expect(buildAuctionWhere(parseBrowseFilters({ format: "AUCTION", taxonomy: "union" }))).not.toBeNull();
  });

  it("parses sort= ending_soon", () => {
    expect(parseBrowseFilters({ sort: "ending_soon" }).sort).toBe("ending_soon");
    expect(parseBrowseFilters({ sort: "bogus" }).sort).toBeUndefined();
  });

  it("still narrows by metal and price when those are set", () => {
    const where = buildAuctionWhere(parseBrowseFilters({ metal: "GOLD" }));
    expect(where?.AND).toContainEqual({ metal: { in: ["GOLD"] } });
  });
});

describe("getActiveFilterPills", () => {
  it("returns no pills for an empty filter state", () => {
    expect(getActiveFilterPills(parseBrowseFilters({}))).toEqual([]);
  });

  it("returns one pill per selected value across dimensions", () => {
    const pills = getActiveFilterPills(parseBrowseFilters({ cert: "NGC,PCGS", metal: "GOLD" }));
    expect(pills.map((p) => p.id)).toEqual(["cert-NGC", "cert-PCGS", "metal-GOLD"]);
  });

  it("a pill's hrefQuery removes only that one filter value", () => {
    const filters = parseBrowseFilters({ cert: "NGC,PCGS" });
    const pills = getActiveFilterPills(filters);
    const ngcPill = pills.find((p) => p.id === "cert-NGC")!;
    const remaining = parseBrowseFilters(Object.fromEntries(new URLSearchParams(ngcPill.hrefQuery)));
    expect(remaining.certifications).toEqual(["PCGS"]);
  });

  it("collapses a year range into a single pill", () => {
    const pills = getActiveFilterPills(parseBrowseFilters({ minYear: "1874", maxYear: "1902" }));
    expect(pills).toHaveLength(1);
    expect(pills[0].id).toBe("year-range");
    expect(pills[0].label).toBe("1874–1902");
  });

  it("shows the taxonomy pill with the 'Parent / Child' label", () => {
    const pills = getActiveFilterPills(parseBrowseFilters({ taxonomy: "zar-ponde" }));
    expect(pills[0].label).toContain("ZAR (1852–1902) / Ponde");
  });
});
