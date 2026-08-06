import { describe, expect, it } from "vitest";

import type { ListingCardData } from "@/components/ListingCard";
import {
  filterListingCardsByTab,
  sortListingCards,
} from "./marketplace-catalog";

const base: ListingCardData = {
  id: "1",
  title: "Coin",
  category: "COINS",
  priceCents: 100_00,
  images: [],
  shieldAwarded: false,
  seller: { subscriptionTier: "STANDARD" },
};

describe("filterListingCardsByTab", () => {
  it("keeps only AUCTION items on the auction tab", () => {
    const catalog: ListingCardData[] = [
      { ...base, id: "a", type: "AUCTION", endsAtIso: "2026-08-07T00:00:00.000Z" },
      { ...base, id: "b", type: "BUY_NOW" },
    ];
    expect(filterListingCardsByTab(catalog, "auction").map((i) => i.id)).toEqual(["a"]);
    expect(filterListingCardsByTab(catalog, "fixed").map((i) => i.id)).toEqual(["b"]);
  });
});

describe("sortListingCards", () => {
  it("sorts ending_soon by endsAtIso ascending", () => {
    const catalog: ListingCardData[] = [
      { ...base, id: "later", type: "AUCTION", endsAtIso: "2026-08-10T00:00:00.000Z", sortKey: 1 },
      { ...base, id: "soon", type: "AUCTION", endsAtIso: "2026-08-07T00:00:00.000Z", sortKey: 2 },
    ];
    expect(sortListingCards(catalog, "ending_soon").map((i) => i.id)).toEqual(["soon", "later"]);
  });
});
