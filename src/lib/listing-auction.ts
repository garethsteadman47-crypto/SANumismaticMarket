import { AuctionStatus } from "@prisma/client";

import { db } from "@/lib/db";
import type { CreateListingParsed } from "@/lib/validation/listing";
import type { CreateListingResult } from "@/lib/listings";

/**
 * Creates a live auction from the listing wizard's "Live Auction" sale format.
 * Auctions are a separate Prisma model — they don't carry certificate locks
 * in v1 (graded auctions can still store grade text in the description).
 */
export async function createAuctionFromListingInput(
  sellerId: string,
  data: CreateListingParsed
): Promise<CreateListingResult> {
  const endsInDays = data.auctionEndsInDays ?? 7;
  const now = new Date();
  const endsAt = new Date(now.getTime() + endsInDays * 24 * 60 * 60 * 1000);

  const imageUrls = [
    data.coverImageUrl,
    data.obverseImageUrl,
    data.reverseImageUrl,
    data.certificateImageUrl,
    ...data.images,
  ].filter((url): url is string => Boolean(url && url.length > 0));
  const uniqueImages = [...new Set(imageUrls)];

  try {
    const auction = await db.auction.create({
      data: {
        sellerId,
        title: data.title,
        description: [
          data.description,
          data.condition ? `Grade: ${data.condition}` : null,
          data.certificateId ? `Slab serial: ${data.certificateId}` : null,
          data.weightGrams != null ? `Weight: ${data.weightGrams}g` : null,
          data.diameterMm != null ? `Diameter: ${data.diameterMm}mm` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        images: uniqueImages.length > 0 ? uniqueImages : data.images,
        category: data.category,
        metal: data.metal,
        startingPriceCents: data.priceCents,
        bidIncrementCents: Math.max(5_000, Math.round(data.priceCents * 0.02)),
        startsAt: now,
        endsAt,
        status: AuctionStatus.LIVE,
      },
    });

    return {
      success: true,
      listingId: auction.id,
      slug: auction.id,
      shieldAwarded: false,
      auctionId: auction.id,
    };
  } catch (err) {
    console.error("createAuctionFromListingInput failed", err);
    return { success: false, error: "Something went wrong while creating your auction. Please try again." };
  }
}
