import { describe, expect, it } from "vitest";

import {
  buildTaxonomyListingWhere,
  getTaxonomyNode,
  getTaxonomyNodeLabel,
  resolveTaxonomyPredicate,
  TAXONOMY_TREE,
} from "./numismatic-taxonomy";

describe("TAXONOMY_TREE", () => {
  it("has exactly the 6 requested top-level categories", () => {
    expect(TAXONOMY_TREE.map((node) => node.id)).toEqual(["zar", "union", "republic", "sets", "errors", "world"]);
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
    expect(getTaxonomyNodeLabel("zar")).toBe("South African ZAR (1874 – 1902)");
  });

  it("returns 'Parent → Child' for a child node", () => {
    expect(getTaxonomyNodeLabel("zar-ponde")).toBe("South African ZAR (1874 – 1902) → Ponde & Half Ponde");
  });
});

describe("resolveTaxonomyPredicate", () => {
  it("returns the parent's own predicate when selecting a parent", () => {
    const predicate = resolveTaxonomyPredicate("zar");
    expect(predicate?.minYear).toBe(1874);
    expect(predicate?.maxYear).toBe(1902);
    expect(predicate?.metals).toBeUndefined();
  });

  it("merges parent year range with the child's own metal/keyword narrowing", () => {
    const predicate = resolveTaxonomyPredicate("zar-ponde");
    expect(predicate?.minYear).toBe(1874);
    expect(predicate?.maxYear).toBe(1902);
    expect(predicate?.metals).toEqual(["GOLD"]);
    expect(predicate?.keywordsAny).toEqual(["pond"]);
  });

  it("lets a child override the parent's categories when it declares its own", () => {
    const predicate = resolveTaxonomyPredicate("republic-krugerrands");
    expect(predicate?.categories).toEqual(["KRUGERRAND"]);
  });
});

describe("buildTaxonomyListingWhere", () => {
  it("builds a category + year-range where clause for a parent-only predicate", () => {
    const predicate = resolveTaxonomyPredicate("union")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(where.category).toEqual({ in: ["COINS"] });
    expect(where.year).toEqual({ gte: 1910, lte: 1960 });
  });

  it("builds an OR of denomination/title keyword matches for a keyword predicate", () => {
    const predicate = resolveTaxonomyPredicate("zar-shillings")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR).toContainEqual({ denomination: { contains: "shilling", mode: "insensitive" } });
    expect(where.OR).toContainEqual({ title: { contains: "shilling", mode: "insensitive" } });
  });

  it("builds a country-not-South-Africa clause for the world taxonomy", () => {
    const predicate = resolveTaxonomyPredicate("world")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(where.country).toEqual({ not: "South Africa" });
  });

  it("omits fields entirely when the predicate doesn't specify them", () => {
    const where = buildTaxonomyListingWhere({});
    expect(where).toEqual({});
  });
});
