import { describe, expect, it } from "vitest";

import {
  buildTaxonomyListingWhere,
  getTaxonomyNode,
  getTaxonomyNodeLabel,
  HISTORICAL_ERA_IDS,
  inferEraSubcategory,
  resolveTaxonomyPredicate,
  TAXONOMY_TREE,
} from "./numismatic-taxonomy";

describe("TAXONOMY_TREE", () => {
  it("leads with the six strict historical eras", () => {
    expect(TAXONOMY_TREE.slice(0, 6).map((node) => node.id)).toEqual([...HISTORICAL_ERA_IDS]);
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
  it("returns the era label for a parent", () => {
    expect(getTaxonomyNodeLabel("zar")).toBe("ZAR (1852–1902)");
  });

  it("returns 'Parent / Child' for a child node", () => {
    expect(getTaxonomyNodeLabel("zar-ponde")).toBe("ZAR (1852–1902) / Ponde");
    expect(getTaxonomyNodeLabel("first-decimal-50c")).toBe("First Decimal (1961–1964) / 50c");
  });
});

describe("resolveTaxonomyPredicate", () => {
  it("returns the parent's own predicate when selecting a parent", () => {
    const predicate = resolveTaxonomyPredicate("union");
    expect(predicate?.minYear).toBe(1923);
    expect(predicate?.maxYear).toBe(1960);
  });

  it("merges parent year range with the child's keyword narrowing", () => {
    const predicate = resolveTaxonomyPredicate("zar-ponde");
    expect(predicate?.minYear).toBe(1852);
    expect(predicate?.maxYear).toBe(1902);
    expect(predicate?.metals).toEqual(["GOLD"]);
  });

  it("exposes expanded denomination leaves for each era", () => {
    expect(getTaxonomyNode("zar-veldpond")).toBeTruthy();
    expect(getTaxonomyNode("union-half-crowns")).toBeTruthy();
    expect(getTaxonomyNode("second-decimal-half-c")).toBeTruthy();
    expect(getTaxonomyNode("bullion-gold-krugerrands")).toBeTruthy();
    expect(getTaxonomyNode("sets-natura")).toBeTruthy();
    expect(getTaxonomyNode("banknotes-vintage-european")).toBeTruthy();
  });
});

describe("inferEraSubcategory", () => {
  it("maps years onto strict historical eras", () => {
    expect(inferEraSubcategory(1892)).toBe("zar");
    expect(inferEraSubcategory(1950)).toBe("union");
    expect(inferEraSubcategory(1962)).toBe("first-decimal");
    expect(inferEraSubcategory(1975)).toBe("second-decimal");
    expect(inferEraSubcategory(2000)).toBe("third-decimal");
    expect(inferEraSubcategory(2024)).toBe("fourth-decimal");
  });
});

describe("buildTaxonomyListingWhere", () => {
  it("builds a category + year-range where clause for Union", () => {
    const predicate = resolveTaxonomyPredicate("union")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(where.OR).toBeTruthy();
  });

  it("builds banknotes category clause", () => {
    const predicate = resolveTaxonomyPredicate("banknotes")!;
    const where = buildTaxonomyListingWhere(predicate);
    expect(where.OR || where.category).toBeTruthy();
  });

  it("includes International Coins & Banknotes with country leaves", () => {
    expect(getTaxonomyNode("international")).toBeTruthy();
    expect(getTaxonomyNode("intl-great-britain")).toBeTruthy();
    expect(getTaxonomyNode("intl-united-states")).toBeTruthy();
    expect(getTaxonomyNode("intl-germany-notgeld")).toBeTruthy();
    expect(getTaxonomyNode("intl-belarus")).toBeTruthy();
    expect(getTaxonomyNode("intl-cuba")).toBeTruthy();
    expect(getTaxonomyNode("intl-rest-of-world")).toBeTruthy();
  });
});
