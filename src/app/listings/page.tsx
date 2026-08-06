import { Suspense } from "react";

import { db } from "@/lib/db";
import { getAuctionPhase } from "@/lib/auctions";
import {
  BROWSE_PAGE_SIZE,
  buildAuctionOrderBy,
  buildAuctionWhere,
  buildListingOrderBy,
  buildListingWhere,
  parseBrowseFilters,
  resolveBrowseSort,
  serializeBrowseFilters,
} from "@/lib/browse-filters";
import { toBrowseItemFromAuction, toBrowseItemFromListing } from "@/lib/browse";
import { browseItemToListingCard } from "@/lib/marketplace-catalog";
import { MarketplaceBrowse } from "@/components/browse/MarketplaceBrowse";

export const dynamic = "force-dynamic";

const LISTING_BROWSE_SELECT = {
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

/**
 * Unified marketplace dashboard — Buy Now and Live Auctions share one layout:
 * sticky category Sidebar + search/tabs/sort action bar + ListingGrid.
 * Featured listings sort to the top *within* the active category filter only.
 * URL pagination: `?page=` at 24 items per page.
 */
export default async function BuyCoinsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseBrowseFilters(sp);
  const sort = resolveBrowseSort(filters);
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const skip = (page - 1) * BROWSE_PAGE_SIZE;

  const listingWhere = buildListingWhere({ ...filters, formats: ["BUY_NOW"] });
  const auctionWhere = buildAuctionWhere({ ...filters, formats: ["AUCTION"] });

  const [listingTotal, listings, auctionTotal, auctions] = await Promise.all([
    listingWhere ? db.listing.count({ where: listingWhere }) : Promise.resolve(0),
    listingWhere
      ? db.listing.findMany({
          where: listingWhere,
          orderBy: buildListingOrderBy(sort),
          skip,
          take: BROWSE_PAGE_SIZE,
          select: LISTING_BROWSE_SELECT,
        })
      : Promise.resolve([]),
    auctionWhere ? db.auction.count({ where: auctionWhere }) : Promise.resolve(0),
    auctionWhere
      ? db.auction.findMany({
          where: auctionWhere,
          orderBy: buildAuctionOrderBy(sort),
          skip,
          take: BROWSE_PAGE_SIZE,
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

  const listingTotalPages = Math.max(1, Math.ceil(listingTotal / BROWSE_PAGE_SIZE));
  const auctionTotalPages = Math.max(1, Math.ceil(auctionTotal / BROWSE_PAGE_SIZE));

  function hrefForPage(nextPage: number) {
    const qs = serializeBrowseFilters({ ...filters, sort, page: nextPage });
    return qs ? `/listings?${qs}` : "/listings";
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Buy Coins</h1>
        <p className="text-sm text-muted-foreground">
          Browse verified, buyer-protected lots across South Africa&apos;s historical eras — featured
          upgrades stay inside the era you&apos;re viewing.
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
        <MarketplaceBrowse
          catalog={catalog}
          pagination={{
            page,
            listingTotal,
            auctionTotal,
            listingTotalPages,
            auctionTotalPages,
            hrefForPage,
          }}
        />
      </Suspense>
    </main>
  );
}
