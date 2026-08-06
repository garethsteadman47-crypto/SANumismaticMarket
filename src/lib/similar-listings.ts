import { ListingStatus, type ListingCategory } from "@prisma/client";

import { db } from "@/lib/db";
import { getTaxonomyParentId } from "@/lib/numismatic-taxonomy";
import { toBrowseItemFromListing } from "@/lib/browse";
import { browseItemToListingCard } from "@/lib/marketplace-catalog";
import type { ListingCardData } from "@/components/ListingCard";

/**
 * Similar Items: up to 4 ACTIVE listings matching the same subcategory,
 * falling back to the parent era / Listing.category when fewer than 4 exist.
 */
export async function getSimilarListings(input: {
  listingId: string;
  subcategory: string | null | undefined;
  category: ListingCategory;
  limit?: number;
}): Promise<ListingCardData[]> {
  const limit = input.limit ?? 4;
  const select = {
    id: true,
    title: true,
    category: true,
    subcategory: true,
    priceCents: true,
    images: true,
    acceptsOffers: true,
    isSponsored: true,
    isFeatured: true,
    createdAt: true,
    seller: { select: { subscriptionTier: true, isSaandDealer: true } },
    verification: { select: { shieldAwarded: true } },
  } as const;

  const baseWhere = {
    status: ListingStatus.ACTIVE,
    id: { not: input.listingId },
  };

  let rows =
    input.subcategory != null && input.subcategory.length > 0
      ? await db.listing.findMany({
          where: { ...baseWhere, subcategory: input.subcategory },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: limit,
          select,
        })
      : [];

  if (rows.length < limit) {
    const parentEra = input.subcategory ? getTaxonomyParentId(input.subcategory) : null;
    const excludeIds = [input.listingId, ...rows.map((row) => row.id)];
    const fallback =
      parentEra && parentEra !== input.subcategory
        ? await db.listing.findMany({
            where: {
              status: ListingStatus.ACTIVE,
              id: { notIn: excludeIds },
              OR: [
                { subcategory: parentEra },
                { subcategory: { startsWith: `${parentEra}-` } },
              ],
            },
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            take: limit - rows.length,
            select,
          })
        : await db.listing.findMany({
            where: {
              status: ListingStatus.ACTIVE,
              id: { notIn: excludeIds },
              category: input.category,
            },
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            take: limit - rows.length,
            select,
          });
    rows = [...rows, ...fallback];
  }

  if (rows.length < limit) {
    const excludeIds = [input.listingId, ...rows.map((row) => row.id)];
    const categoryFallback = await db.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        id: { notIn: excludeIds },
        category: input.category,
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: limit - rows.length,
      select,
    });
    rows = [...rows, ...categoryFallback];
  }

  return rows.map((listing) => browseItemToListingCard(toBrowseItemFromListing(listing)));
}
