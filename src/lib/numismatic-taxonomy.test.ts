import { describe, expect, it } from "vitest";

import {
  buildTaxonomyListingWhere,
  getTaxonomyNode,
  getTaxonomyNodeLabel,
  resolveTaxonomyPredicate,
  TAXONOMY_TREE,
} from "./numismatic-taxonomy";

describe("TAXONOMY_TREE", () => {
  it("has the six broad parent categories", () => {
    expect(TAXONOMY_TREE.map((node) => node.id)).toEqual([
      "zar",
      "union",
      "republic",
      "bullion",
      "sets",
      "banknotes",
    ]);
  });

  it("avoids ampersands in labels", () => {
    for (const parent of TAXONOMY_TREE) {
      expect(parent.label).not.toContain("&");
      for (const child of parent.children ?? []) {
        expect(child.label).not.toContain("&");
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
});

describe("getTaxonomyNodeLabel", () => {
  it("returns just the label for a parent", () => {
    expect(getTaxonomyNodeLabel("zar")).toBe("ZAR");
  });

  it("returns 'Parent / Child' for a child node", () => {
    expect(getTaxonomyNodeLabel("zar-ponde")).toBe("ZAR / Ponde");
  });
});

describe("resolveTaxonomyPredicate", () => {
  it("returns the parent's own predicate when selecting a parent", () => {
    const predicate = resolveTaxonomyPredicate("union");
    expect(predicate?.minYear).toBe(1910);
    expect(predicate?.maxYear).toBe(1960);
  });

  it("merges parent year range with the child's keyword narrowing", () => {
    const predicate = resolveTaxonomyPredicate("zar-ponde");
    expect(predicate?.minYear).toBe(1874);
    expect(predicate?.maxYear).toBe(1902);
    expect(predicate?.metals).toEqual(["GOLD"]);
  });
});

describe("buildTaxonomyListingWhere", () => {
  it("builds a category + year-range where clause for Union", () => {
    const predicate = resolveTaxonomyPredicate("union")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(where.category).toEqual({ in: ["COINS"] });
    expect(where.year).toEqual({ gte: 1910, lte: 1960 });
  });

  it("builds banknotes category clause", () => {
    const predicate = resolveTaxonomyPredicate("banknotes")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(where.category).toEqual({ in: ["BANKNOTES"] });
  });
});
