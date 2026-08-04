import type { ListingCategory, ListingType, SubscriptionTier } from "@prisma/client";
import type { ListingCardData } from "@/components/ListingCard";

interface ListingWithCardRelations {
  id: string;
  title: string;
  category: ListingCategory;
  priceCents: number;
  images: string[];
  listingType?: ListingType;
  isSponsored?: boolean;
  seller: { subscriptionTier: SubscriptionTier };
  verification: { shieldAwarded: boolean } | null;
}

/** Maps a Prisma `Listing` (with its seller + verification relations selected) to `ListingCard` view props. */
export function toListingCardData(listing: ListingWithCardRelations): ListingCardData {
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    priceCents: listing.priceCents,
    images: listing.images,
    shieldAwarded: listing.verification?.shieldAwarded ?? false,
    listingType: listing.listingType,
    isSponsored: listing.isSponsored ?? false,
    seller: { subscriptionTier: listing.seller.subscriptionTier },
  };
}

export const LISTING_CARD_SELECT = {
  id: true,
  title: true,
  category: true,
  priceCents: true,
  images: true,
  listingType: true,
  isSponsored: true,
  seller: { select: { subscriptionTier: true } },
  verification: { select: { shieldAwarded: true } },
} as const;
