import { describe, expect, it } from "vitest";

import { listingMatchesSearch } from "@/lib/saved-searches";

const LISTING = {
  id: "1",
  title: "1931 Union Tickey MS64",
  description: "Key date Union tickey in NGC holder",
  denomination: "3d",
  condition: "MS64",
  subcategory: "UNION_1923_1960",
  year: 1931,
  priceCents: 2_500_000,
  createdAt: new Date(),
};

describe("listingMatchesSearch", () => {
  it("matches keyword + era + grade within price bounds", () => {
    expect(
      listingMatchesSearch(LISTING, {
        keyword: "tickey",
        era: "UNION_1923_1960",
        grade: "MS",
        category: null,
        minPrice: 10000,
        maxPrice: 30000,
      }),
    ).toBe(true);
  });

  it("rejects when price is above max", () => {
    expect(
      listingMatchesSearch(LISTING, {
        keyword: null,
        era: null,
        grade: null,
        category: null,
        minPrice: null,
        maxPrice: 100,
      }),
    ).toBe(false);
  });

  it("rejects when keyword misses", () => {
    expect(
      listingMatchesSearch(LISTING, {
        keyword: "krugerrand",
        era: null,
        grade: null,
        category: null,
        minPrice: null,
        maxPrice: null,
      }),
    ).toBe(false);
  });
});
