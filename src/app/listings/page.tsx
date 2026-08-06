import { Suspense } from "react";

import { db } from "@/lib/db";
import { getAuctionPhase } from "@/lib/auctions";
import {
  buildAuctionWhere,
  buildListingWhere,
  getActiveFilterPills,
  parseBrowseFilters,
  resolveBrowseSort,
  serializeBrowseFilters,
} from "@/lib/browse-filters";
import { mergeBrowseItems, toBrowseItemFromAuction, toBrowseItemFromListing } from "@/lib/browse";
import { FilterSidebar } from "@/components/browse/FilterSidebar";
import { MobileFilterDrawer } from "@/components/browse/MobileFilterDrawer";
import { ActiveFilterPills } from "@/components/browse/ActiveFilterPills";
import { BrowseGrid } from "@/components/browse/BrowseGrid";
import { BrowseEmptyState } from "@/components/browse/BrowseEmptyState";
import { BrowseSearchTabs } from "@/components/browse/BrowseSearchTabs";

export const dynamic = "force-dynamic";

const BASE_PATH = "/listings";

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

/** "Buy Coins" — the main numismatic browse experience: category taxonomy + faceted filters over listings and live auctions. */
export default async function BuyCoinsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseBrowseFilters(sp);

  // Default the browse page to Buy Now mode when no format facet is set,
  // matching the Buy Now / Auction tabs above the grid.
  const effectiveFilters =
    filters.formats.length === 0 ? { ...filters, formats: ["BUY_NOW" as const] } : filters;
  const sort = resolveBrowseSort(effectiveFilters);

  const listingWhere = buildListingWhere(effectiveFilters);
  const auctionWhere = buildAuctionWhere(effectiveFilters);

  const auctionOrderBy =
    sort === "ending_soon"
      ? ({ endsAt: "asc" } as const)
      : sort === "price_asc"
        ? ({ startingPriceCents: "asc" } as const)
        : sort === "price_desc"
          ? ({ startingPriceCents: "desc" } as const)
          : ({ createdAt: "desc" } as const);

  const listingOrderBy =
    sort === "price_asc"
      ? ({ priceCents: "asc" } as const)
      : sort === "price_desc"
        ? ({ priceCents: "desc" } as const)
        : ({ createdAt: "desc" } as const);

  const [listings, auctions] = await Promise.all([
    listingWhere
      ? db.listing.findMany({ where: listingWhere, orderBy: listingOrderBy, take: 60, select: LISTING_BROWSE_SELECT })
      : Promise.resolve([]),
    auctionWhere
      ? db.auction.findMany({
          where: auctionWhere,
          orderBy: auctionOrderBy,
          take: 60,
          include: {
            seller: { select: { subscriptionTier: true, isSaandDealer: true } },
            _count: { select: { bids: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const listingItems = listings.map(toBrowseItemFromListing);
  const auctionItems = auctions.map((auction) => toBrowseItemFromAuction(auction, getAuctionPhase(auction)));
  const items = mergeBrowseItems(listingItems, auctionItems, sort);

  // Mode is controlled by the Buy Now / Auction tabs — omit those from filter pills.
  const pills = getActiveFilterPills({
    ...effectiveFilters,
    formats: effectiveFilters.formats.filter((format) => format === "OFFERS"),
  });
  const currentQueryString = serializeBrowseFilters({ ...effectiveFilters, sort });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Buy Coins</h1>
        <p className="text-sm text-muted-foreground">
          Browse every verified, buyer-protected listing and live auction across coins, banknotes, bullion, and
          Krugerrands.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-28 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40" />
        }
      >
        <BrowseSearchTabs basePath={BASE_PATH} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border p-4">
            <FilterSidebar basePath={BASE_PATH} />
          </div>
        </aside>

        <div className="flex flex-col gap-4">
          <ActiveFilterPills pills={pills} basePath={BASE_PATH} />

          {items.length === 0 ? (
            <BrowseEmptyState basePath={BASE_PATH} queryString={currentQueryString} />
          ) : (
            <BrowseGrid items={items} />
          )}
        </div>
      </div>

      <MobileFilterDrawer basePath={BASE_PATH} activeCount={pills.length} />
    </main>
  );
}
