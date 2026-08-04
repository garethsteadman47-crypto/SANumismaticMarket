import { describe, expect, it } from "vitest";

import {
  buildTaxonomyListingWhere,
  getTaxonomyNode,
  getTaxonomyNodeLabel,
  resolveTaxonomyPredicate,
  TAXONOMY_TREE,
} from "./numismatic-taxonomy";

describe("TAXONOMY_TREE", () => {
  it("has exactly the 4 requested top-level categories", () => {
    expect(TAXONOMY_TREE.map((node) => node.id)).toEqual([
      "zar-union",
      "republic",
      "banknotes",
      "sets-wildlife",
    ]);
  });

  it("every node uses an icon key instead of emoji", () => {
    for (const parent of TAXONOMY_TREE) {
      expect(parent.icon).toBeTruthy();
      expect(typeof parent.icon).toBe("string");
      for (const child of parent.children ?? []) {
        expect(child.icon).toBeTruthy();
      }
    }
  });

  it("every child id is discoverable via getTaxonomyNode", () => {
    for (const parent of TAXONOMY_TREE) {
      for (const child of parent.children ?? []) {
        const entry = getTaxonomyNode(child.id);
        expect(entry?.node.id).toBe(child.id);
        expect(entry?.parent?.id).toBe(parent.id);
      }
    }
  });

  it("returns undefined for an unknown id", () => {
    expect(getTaxonomyNode("not-a-real-node")).toBeUndefined();
    expect(getTaxonomyNodeLabel("not-a-real-node")).toBeUndefined();
  });
});

describe("getTaxonomyNodeLabel", () => {
  it("returns just the label for a parent", () => {
    expect(getTaxonomyNodeLabel("zar-union")).toBe("South African ZAR & Union");
  });

  it("returns 'Parent → Child' for a child node", () => {
    expect(getTaxonomyNodeLabel("zar-ponde")).toBe("South African ZAR & Union → Ponde");
  });
});

describe("resolveTaxonomyPredicate", () => {
  it("returns the parent's own predicate when selecting a parent", () => {
    const predicate = resolveTaxonomyPredicate("zar-union");
    expect(predicate?.minYear).toBe(1874);
    expect(predicate?.maxYear).toBe(1960);
    expect(predicate?.metals).toBeUndefined();
  });

  it("merges parent year range with the child's own metal/keyword narrowing", () => {
    const predicate = resolveTaxonomyPredicate("zar-ponde");
    expect(predicate?.minYear).toBe(1874);
    expect(predicate?.maxYear).toBe(1902);
    expect(predicate?.metals).toEqual(["GOLD"]);
    expect(predicate?.keywordsAny).toEqual(["pond", "ponde"]);
  });

  it("lets a child override the parent's categories when it declares its own", () => {
    const predicate = resolveTaxonomyPredicate("republic-silver-krugerrands");
    expect(predicate?.categories).toEqual(["KRUGERRAND", "COINS"]);
    expect(predicate?.metals).toEqual(["SILVER"]);
  });
});

describe("buildTaxonomyListingWhere", () => {
  it("builds a category + year-range where clause for a parent-only predicate", () => {
    const predicate = resolveTaxonomyPredicate("zar-union")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(where.category).toEqual({ in: ["COINS"] });
    expect(where.year).toEqual({ gte: 1874, lte: 1960 });
  });

  it("builds an OR of denomination/title keyword matches for a keyword predicate", () => {
    const predicate = resolveTaxonomyPredicate("zar-shillings")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR).toContainEqual({ denomination: { contains: "shilling", mode: "insensitive" } });
    expect(where.OR).toContainEqual({ title: { contains: "shilling", mode: "insensitive" } });
  });

  it("builds a country-not-South-Africa clause for international banknotes", () => {
    const predicate = resolveTaxonomyPredicate("banknotes")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(where.country).toEqual({ not: "South Africa" });
    expect(where.category).toEqual({ in: ["BANKNOTES"] });
  });

  it("omits fields entirely when the predicate doesn't specify them", () => {
    const where = buildTaxonomyListingWhere({});
    expect(where).toEqual({});
  });
});
