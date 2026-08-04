import { db } from "@/lib/db";

export type WishlistResult = { success: true; wishlisted: boolean } | { success: false; error: string };

export async function toggleWishlist(userId: string, listingId: string): Promise<WishlistResult> {
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { id: true } });
  if (!listing) return { success: false, error: "Listing not found." };

  const existing = await db.wishlistItem.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return { success: true, wishlisted: false };
  }

  await db.wishlistItem.create({ data: { userId, listingId } });
  return { success: true, wishlisted: true };
}

export async function listWishlist(userId: string) {
  return db.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          category: true,
          priceCents: true,
          images: true,
          listingType: true,
          isSponsored: true,
          status: true,
          seller: {
            select: {
              subscriptionTier: true,
              isSaandDealer: true,
              isCoinClubMember: true,
              completedSalesCount: true,
            },
          },
          verification: { select: { shieldAwarded: true } },
        },
      },
    },
  });
}

export async function getWishlistListingIds(userId: string): Promise<Set<string>> {
  const rows = await db.wishlistItem.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return new Set(rows.map((r) => r.listingId));
}
