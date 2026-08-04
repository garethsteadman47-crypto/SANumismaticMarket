import { db } from "@/lib/db";
import { getAuctionPhase } from "@/lib/auctions";
import { buildAuctionWhere, buildListingWhere, getActiveFilterPills, parseBrowseFilters, serializeBrowseFilters } from "@/lib/browse-filters";
import { mergeBrowseItems, toBrowseItemFromAuction, toBrowseItemFromListing } from "@/lib/browse";
import { FilterSidebar } from "@/components/browse/FilterSidebar";
import { MobileFilterDrawer } from "@/components/browse/MobileFilterDrawer";
import { ActiveFilterPills } from "@/components/browse/ActiveFilterPills";
import { BrowseGrid } from "@/components/browse/BrowseGrid";
import { BrowseEmptyState } from "@/components/browse/BrowseEmptyState";

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

  const listingWhere = buildListingWhere(filters);
  const auctionWhere = buildAuctionWhere(filters);

  const [listings, auctions] = await Promise.all([
    listingWhere
      ? db.listing.findMany({ where: listingWhere, orderBy: { createdAt: "desc" }, take: 60, select: LISTING_BROWSE_SELECT })
      : Promise.resolve([]),
    auctionWhere
      ? db.auction.findMany({
          where: auctionWhere,
          orderBy: { createdAt: "desc" },
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
  const items = mergeBrowseItems(listingItems, auctionItems);

  const pills = getActiveFilterPills(filters);
  const currentQueryString = serializeBrowseFilters(filters);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Buy Coins</h1>
        <p className="text-sm text-muted-foreground">
          Browse every verified, buyer-protected listing and live auction across coins, banknotes, bullion, and
          Krugerrands.
        </p>
      </div>

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
