import type { BrowseItem } from "@/lib/browse";
import type { BrowseSort } from "@/lib/browse-filters";
import type { ListingCardData } from "@/components/ListingCard";

/** Maps a unified browse item into ListingCard props (Buy Now + Auction). */
export function browseItemToListingCard(item: BrowseItem): ListingCardData {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    priceCents: item.priceCents,
    images: item.image ? [item.image] : [],
    shieldAwarded: item.shieldAwarded,
    type: item.kind === "auction" ? "AUCTION" : "BUY_NOW",
    href: item.href,
    endsAtIso: item.endsAtIso,
    auctionPhase: item.auctionPhase,
    bidCount: item.bidCount,
    sortKey: item.sortKey,
    seller: {
      subscriptionTier: item.sellerTier,
      isSaandDealer: item.isSaandDealer,
    },
  };
}

/** Client-side sort for the unified marketplace grid. */
export function sortListingCards(listings: ListingCardData[], sort: BrowseSort): ListingCardData[] {
  const items = [...listings];
  switch (sort) {
    case "price_asc":
      return items.sort((a, b) => a.priceCents - b.priceCents || (b.sortKey ?? 0) - (a.sortKey ?? 0));
    case "price_desc":
      return items.sort((a, b) => b.priceCents - a.priceCents || (b.sortKey ?? 0) - (a.sortKey ?? 0));
    case "ending_soon":
      return items.sort((a, b) => {
        const aEnd = a.endsAtIso ? new Date(a.endsAtIso).getTime() : Number.POSITIVE_INFINITY;
        const bEnd = b.endsAtIso ? new Date(b.endsAtIso).getTime() : Number.POSITIVE_INFINITY;
        if (aEnd !== bEnd) return aEnd - bEnd;
        return (b.sortKey ?? 0) - (a.sortKey ?? 0);
      });
    case "newest":
    default:
      return items.sort((a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0));
  }
}

/** Filter catalog by marketplace tab (fixed vs auction). */
export function filterListingCardsByTab(
  listings: ListingCardData[],
  activeTab: "fixed" | "auction",
): ListingCardData[] {
  if (activeTab === "auction") {
    return listings.filter((item) => item.type === "AUCTION");
  }
  return listings.filter((item) => item.type !== "AUCTION");
}

/** Optional free-text refine on an already-loaded catalog. */
export function filterListingCardsByQuery(listings: ListingCardData[], query?: string): ListingCardData[] {
  const q = query?.trim().toLowerCase();
  if (!q) return listings;
  return listings.filter((item) => item.title.toLowerCase().includes(q));
}
