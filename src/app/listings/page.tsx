import { Suspense } from "react";

import { db } from "@/lib/db";
import { getAuctionPhase } from "@/lib/auctions";
import { buildAuctionWhere, buildListingWhere, parseBrowseFilters } from "@/lib/browse-filters";
import { toBrowseItemFromAuction, toBrowseItemFromListing } from "@/lib/browse";
import { browseItemToListingCard } from "@/lib/marketplace-catalog";
import { MarketplaceBrowse } from "@/components/browse/MarketplaceBrowse";

export const dynamic = "force-dynamic";

const LISTING_BROWSE_SELECT = {
  id: true,
  title: true,
  category: true,
  priceCents: true,
  images: true,
  acceptsOffers: true,
  createdAt: true,
  seller: { select: { subscriptionTier: true, isSaandDealer: true } },
  verification: { select: { shieldAwarded: true } },
} as const;

/**
 * Unified marketplace dashboard — Buy Now and Live Auctions share one layout:
 * sticky category Sidebar + search/tabs/sort action bar + ListingGrid.
 * Tab mode is URL-driven (`format=`) so the sidebar never unmounts on switch.
 */
export default async function BuyCoinsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseBrowseFilters(sp);

  // Always load both catalogues for the current taxonomy / search / facets.
  // The client MarketplaceBrowse filters by active tab so switching Buy Now ↔
  // Live Auctions does not require a separate page route.
  const listingWhere = buildListingWhere({ ...filters, formats: ["BUY_NOW"] });
  const auctionWhere = buildAuctionWhere({ ...filters, formats: ["AUCTION"] });

  const [listings, auctions] = await Promise.all([
    listingWhere
      ? db.listing.findMany({
          where: listingWhere,
          orderBy: { createdAt: "desc" },
          take: 80,
          select: LISTING_BROWSE_SELECT,
        })
      : Promise.resolve([]),
    auctionWhere
      ? db.auction.findMany({
          where: auctionWhere,
          orderBy: { endsAt: "asc" },
          take: 80,
          include: {
            seller: { select: { subscriptionTier: true, isSaandDealer: true } },
            _count: { select: { bids: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const catalog = [
    ...listings.map((listing) => browseItemToListingCard(toBrowseItemFromListing(listing))),
    ...auctions.map((auction) =>
      browseItemToListingCard(toBrowseItemFromAuction(auction, getAuctionPhase(auction))),
    ),
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Buy Coins</h1>
        <p className="text-sm text-muted-foreground">
          Browse every verified, buyer-protected listing and live auction across coins, banknotes, bullion, and
          Krugerrands — same categories, search, and sort for Buy Now and Live Auctions.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
            <div className="hidden h-96 animate-pulse rounded-lg border bg-muted/40 lg:block" />
            <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />
          </div>
        }
      >
        <MarketplaceBrowse catalog={catalog} />
      </Suspense>
    </main>
  );
}
