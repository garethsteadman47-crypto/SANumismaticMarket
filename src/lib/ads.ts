import { AdSlotType, ListingCategory } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * UI Real Estate Ad Engine — capped slot system.
 *
 * The hard caps below are enforced *twice*: once by `slotPosition` bounds
 * checking wherever placements are created (not built yet — no admin UI in
 * this step), and again here via `take`, so a stray/duplicated row can
 * never cause more than the allowed number of ad slots to render.
 */
export const AD_SLOT_CAPS: Record<AdSlotType, number> = {
  HOMEPAGE_HERO: 3,
  CATEGORY_BANNER: 2,
};

export interface ActiveAdPlacement {
  id: string;
  imageUrl: string;
  targetUrl: string;
  slotPosition: number;
}

export async function getActiveAdPlacements(
  slotType: AdSlotType,
  category?: ListingCategory
): Promise<ActiveAdPlacement[]> {
  const now = new Date();

  const placements = await db.adPlacement.findMany({
    where: {
      slotType,
      // Only meaningful for CATEGORY_BANNER — Prisma ignores `undefined`
      // filter values, so HOMEPAGE_HERO simply isn't filtered by category.
      category: slotType === AdSlotType.CATEGORY_BANNER ? category : undefined,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { slotPosition: "asc" },
    take: AD_SLOT_CAPS[slotType],
    select: { id: true, imageUrl: true, targetUrl: true, slotPosition: true },
  });

  return placements;
}
