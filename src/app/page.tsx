import { AdSlotType, ListingCategory, ListingStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { getActiveAdPlacements } from "@/lib/ads";
import { LISTING_CARD_SELECT, toListingCardData } from "@/lib/listing-card";
import { HeroCarousel } from "@/components/ads/HeroCarousel";
import { ListingSection } from "@/components/ListingSection";

export const dynamic = "force-dynamic";

const SECTION_TAKE = 8;

export default async function HomePage() {
  const [heroSlots, verifiedGraded, krugerrands, recentListings] = await Promise.all([
    getActiveAdPlacements(AdSlotType.HOMEPAGE_HERO),
    db.listing.findMany({
      where: { status: ListingStatus.ACTIVE, verification: { shieldAwarded: true } },
      orderBy: { createdAt: "desc" },
      take: SECTION_TAKE,
      select: LISTING_CARD_SELECT,
    }),
    db.listing.findMany({
      where: { status: ListingStatus.ACTIVE, category: ListingCategory.KRUGERRAND },
      orderBy: { createdAt: "desc" },
      take: SECTION_TAKE,
      select: LISTING_CARD_SELECT,
    }),
    db.listing.findMany({
      where: { status: ListingStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      take: SECTION_TAKE,
      select: LISTING_CARD_SELECT,
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-6">
      <HeroCarousel slots={heroSlots} />

      <ListingSection
        title="Verified Graded Coins"
        description="Independently verified certificates, backed by the Verified Authentic Shield."
        viewAllHref="/category/coins"
        listings={verifiedGraded.map(toListingCardData)}
        emptyMessage="No verified listings yet — be the first to list a graded coin."
      />

      <ListingSection
        title="Gold & Silver Krugerrands"
        description="South Africa's iconic bullion coin, in gold and silver."
        viewAllHref="/category/krugerrands"
        listings={krugerrands.map(toListingCardData)}
        emptyMessage="No Krugerrand listings yet."
      />

      <ListingSection
        title="Recent Listings"
        description="Freshly listed coins, banknotes, and bullion."
        listings={recentListings.map(toListingCardData)}
        emptyMessage="No listings yet — check back soon."
      />
    </main>
  );
}
