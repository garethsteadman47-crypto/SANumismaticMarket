import type { ListingCategory, SubscriptionTier } from "@prisma/client";

import type { AuctionPhase } from "@/lib/auctions";
import { formatZarCents } from "@/lib/utils/currency";

/**
 * Normalizes a fixed-price `Listing` and a timed `Auction` into one shape
 * so `/listings` can render both in a single unified grid — needed for the
 * "Live Auctions" Buying Format filter to mean something real rather than
 * just linking off to a separate page.
 */

export type BrowseItemFormat = "BUY_NOW" | "OFFERS" | "AUCTION";

export interface BrowseItem {
  kind: "listing" | "auction";
  id: string;
  href: string;
  title: string;
  image: string | null;
  category: ListingCategory;
  priceLabel: string;
  priceCents: number;
  shieldAwarded: boolean;
  sellerTier: SubscriptionTier;
  formats: BrowseItemFormat[];
  auctionPhase?: AuctionPhase;
  endsAtIso?: string;
  bidCount?: number;
  /** Millisecond timestamp used to sort listings and auctions together. */
  sortKey: number;
}

export interface ListingForBrowse {
  id: string;
  title: string;
  category: ListingCategory;
  priceCents: number;
  images: string[];
  acceptsOffers: boolean;
  createdAt: Date;
  seller: { subscriptionTier: SubscriptionTier };
  verification: { shieldAwarded: boolean } | null;
}

export function toBrowseItemFromListing(listing: ListingForBrowse): BrowseItem {
  const formats: BrowseItemFormat[] = ["BUY_NOW"];
  if (listing.acceptsOffers) formats.push("OFFERS");

  return {
    kind: "listing",
    id: listing.id,
    href: `/listings/${listing.id}`,
    title: listing.title,
    image: listing.images[0] ?? null,
    category: listing.category,
    priceLabel: formatZarCents(listing.priceCents),
    priceCents: listing.priceCents,
    shieldAwarded: listing.verification?.shieldAwarded ?? false,
    sellerTier: listing.seller.subscriptionTier,
    formats,
    sortKey: listing.createdAt.getTime(),
  };
}

export interface AuctionForBrowse {
  id: string;
  title: string;
  category: ListingCategory;
  images: string[];
  startingPriceCents: number;
  currentBidCents: number | null;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  seller: { subscriptionTier: SubscriptionTier };
  _count: { bids: number };
}

export function toBrowseItemFromAuction(auction: AuctionForBrowse, phase: AuctionPhase): BrowseItem {
  const effectivePriceCents = auction.currentBidCents ?? auction.startingPriceCents;

  return {
    kind: "auction",
    id: auction.id,
    href: `/auctions/${auction.id}`,
    title: auction.title,
    image: auction.images[0] ?? null,
    category: auction.category,
    priceLabel: formatZarCents(effectivePriceCents),
    priceCents: effectivePriceCents,
    shieldAwarded: false,
    sellerTier: auction.seller.subscriptionTier,
    formats: ["AUCTION"],
    auctionPhase: phase,
    endsAtIso: (phase === "SCHEDULED" ? auction.startsAt : auction.endsAt).toISOString(),
    bidCount: auction._count.bids,
    sortKey: auction.createdAt.getTime(),
  };
}

/** Combines and sorts listing + auction browse items newest-first. */
export function mergeBrowseItems(listingItems: BrowseItem[], auctionItems: BrowseItem[]): BrowseItem[] {
  return [...listingItems, ...auctionItems].sort((a, b) => b.sortKey - a.sortKey);
}
