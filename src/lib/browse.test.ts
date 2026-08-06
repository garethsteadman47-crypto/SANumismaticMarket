import { describe, expect, it } from "vitest";

import { mergeBrowseItems, toBrowseItemFromAuction, toBrowseItemFromListing } from "./browse";

const baseListing = {
  id: "listing-1",
  title: "1967 RSA Silver Rand",
  category: "COINS" as const,
  priceCents: 425_00,
  images: ["https://example.com/photo.jpg"],
  acceptsOffers: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  seller: { subscriptionTier: "GOLD" as const },
  verification: { shieldAwarded: true },
};

const baseAuction = {
  id: "auction-1",
  title: "1898 ZAR Single 9 Pond",
  category: "COINS" as const,
  images: ["https://example.com/pond.jpg"],
  startingPriceCents: 1_500_000,
  currentBidCents: null,
  status: "LIVE" as const,
  startsAt: new Date("2026-02-01T00:00:00.000Z"),
  endsAt: new Date("2026-02-02T00:00:00.000Z"),
  createdAt: new Date("2026-01-15T00:00:00.000Z"),
  seller: { subscriptionTier: "SILVER" as const },
  _count: { bids: 0 },
};

describe("toBrowseItemFromListing", () => {
  it("includes both BUY_NOW and OFFERS formats when the listing accepts offers", () => {
    const item = toBrowseItemFromListing(baseListing);
    expect(item.kind).toBe("listing");
    expect(item.formats).toEqual(["BUY_NOW", "OFFERS"]);
    expect(item.href).toBe("/listings/listing-1");
    expect(item.priceLabel).toContain("425");
  });

  it("excludes OFFERS when acceptsOffers is false", () => {
    const item = toBrowseItemFromListing({ ...baseListing, acceptsOffers: false });
    expect(item.formats).toEqual(["BUY_NOW"]);
  });

  it("falls back to null image when there are no images", () => {
    const item = toBrowseItemFromListing({ ...baseListing, images: [] });
    expect(item.image).toBeNull();
  });

  it("reflects shieldAwarded from the verification relation", () => {
    expect(toBrowseItemFromListing(baseListing).shieldAwarded).toBe(true);
    expect(toBrowseItemFromListing({ ...baseListing, verification: null }).shieldAwarded).toBe(false);
  });
});

describe("toBrowseItemFromAuction", () => {
  it("uses the starting price when there's no current bid", () => {
    const item = toBrowseItemFromAuction(baseAuction, "LIVE");
    expect(item.priceCents).toBe(1_500_000);
    expect(item.formats).toEqual(["AUCTION"]);
    expect(item.href).toBe("/auctions/auction-1");
  });

  it("uses the current bid when one exists", () => {
    const item = toBrowseItemFromAuction({ ...baseAuction, currentBidCents: 1_600_000 }, "LIVE");
    expect(item.priceCents).toBe(1_600_000);
  });

  it("uses endsAt for a LIVE auction's countdown and startsAt for a SCHEDULED one", () => {
    const live = toBrowseItemFromAuction(baseAuction, "LIVE");
    expect(live.endsAtIso).toBe(baseAuction.endsAt.toISOString());

    const scheduled = toBrowseItemFromAuction(baseAuction, "SCHEDULED");
    expect(scheduled.endsAtIso).toBe(baseAuction.startsAt.toISOString());
  });
});

describe("mergeBrowseItems", () => {
  it("sorts combined listings and auctions newest-first by sortKey", () => {
    const listingItem = toBrowseItemFromListing(baseListing); // createdAt 2026-01-01
    const auctionItem = toBrowseItemFromAuction(baseAuction, "LIVE"); // createdAt 2026-01-15

    const merged = mergeBrowseItems([listingItem], [auctionItem], "newest");
    expect(merged.map((item) => item.id)).toEqual(["auction-1", "listing-1"]);
  });

  it("sorts ending_soon by endsAtIso ascending", () => {
    const soon = toBrowseItemFromAuction(baseAuction, "LIVE");
    const later = toBrowseItemFromAuction(
      { ...baseAuction, id: "auction-2", endsAt: new Date("2026-02-10T00:00:00.000Z") },
      "LIVE",
    );
    const merged = mergeBrowseItems([], [later, soon], "ending_soon");
    expect(merged.map((item) => item.id)).toEqual(["auction-1", "auction-2"]);
  });
});
