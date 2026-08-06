"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDownIcon, CoinsIcon, GavelIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingGrid } from "@/components/ListingGrid";
import { Sidebar } from "@/components/Sidebar";
import { MobileFilterDrawer } from "@/components/browse/MobileFilterDrawer";
import { ActiveFilterPills } from "@/components/browse/ActiveFilterPills";
import type { ListingCardData } from "@/components/ListingCard";
import {
  filterListingCardsByQuery,
  filterListingCardsByTab,
  sortListingCards,
} from "@/lib/marketplace-catalog";
import {
  BROWSE_SORT_LABELS,
  getActiveFilterPills,
  parseBrowseFilters,
  resolveBrowseSort,
  serializeBrowseFilters,
  type BrowseFilterState,
  type BrowseSort,
  type BuyingFormat,
} from "@/lib/browse-filters";
import { cn } from "@/lib/utils";

const BASE_PATH = "/listings";

type ActiveTab = "fixed" | "auction";

function resolveTab(formats: BuyingFormat[]): ActiveTab {
  return formats.length === 1 && formats[0] === "AUCTION" ? "auction" : "fixed";
}

function tabFormats(tab: ActiveTab): BuyingFormat[] {
  return tab === "auction" ? ["AUCTION"] : ["BUY_NOW"];
}

function defaultSortForTab(tab: ActiveTab): BrowseSort {
  return tab === "auction" ? "ending_soon" : "newest";
}

/**
 * Unified marketplace shell: sticky category Sidebar + action bar (search / tabs / sort)
 * + shared ListingGrid. Tab switches update URL params without tearing down the sidebar.
 */
export function MarketplaceBrowse({
  catalog,
  pagination,
}: {
  catalog: ListingCardData[];
  pagination: {
    page: number;
    listingTotal: number;
    auctionTotal: number;
    listingTotalPages: number;
    auctionTotalPages: number;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseBrowseFilters(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const activeTab = resolveTab(filters.formats);
  const sortOrder = resolveBrowseSort({ ...filters, formats: tabFormats(activeTab) });
  const [searchDraft, setSearchDraft] = useState(filters.q ?? "");

  // Build pagination hrefs on the client — functions cannot cross the RSC boundary.
  function hrefForPage(nextPage: number) {
    const qs = serializeBrowseFilters({
      ...filters,
      formats: tabFormats(activeTab),
      sort: sortOrder,
      page: nextPage,
    });
    return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
  }

  useEffect(() => {
    setSearchDraft(filters.q ?? "");
  }, [filters.q]);

  function navigate(next: BrowseFilterState, method: "push" | "replace" = "push") {
    // Reset to page 1 whenever filters/sort/tab change (unless page explicitly set).
    const withPage = { ...next, page: next.page && next.page > 1 ? next.page : undefined };
    const qs = serializeBrowseFilters(withPage);
    const href = qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
    if (method === "replace") {
      router.replace(href, { scroll: false });
    } else {
      router.push(href, { scroll: false });
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = searchDraft.trim();
    navigate({
      ...filters,
      q: trimmed || undefined,
      formats: tabFormats(activeTab),
      sort: filters.sort ?? defaultSortForTab(activeTab),
      page: 1,
    });
  }

  function handleTabChange(nextTab: ActiveTab) {
    navigate({
      ...filters,
      certifications: nextTab === "auction" ? [] : filters.certifications,
      gradeBrackets: nextTab === "auction" ? [] : filters.gradeBrackets,
      minYear: nextTab === "auction" ? undefined : filters.minYear,
      maxYear: nextTab === "auction" ? undefined : filters.maxYear,
      formats: tabFormats(nextTab),
      sort: defaultSortForTab(nextTab),
      page: 1,
    });
  }

  function handleSortChange(nextSort: string | null) {
    if (!nextSort) return;
    navigate({
      ...filters,
      formats: tabFormats(activeTab),
      sort: nextSort as BrowseSort,
      page: 1,
    });
  }

  const visibleListings = useMemo(() => {
    const byTab = filterListingCardsByTab(catalog, activeTab);
    const byQuery = filterListingCardsByQuery(byTab, filters.q);
    return sortListingCards(byQuery, sortOrder);
  }, [catalog, activeTab, filters.q, sortOrder]);

  const pills = getActiveFilterPills({
    ...filters,
    formats: filters.formats.filter((format) => format === "OFFERS"),
  });

  const sortOptions: BrowseSort[] =
    activeTab === "auction"
      ? ["ending_soon", "newest", "price_asc", "price_desc"]
      : ["newest", "price_asc", "price_desc"];

  const totalPages = activeTab === "auction" ? pagination.auctionTotalPages : pagination.listingTotalPages;
  const totalCount = activeTab === "auction" ? pagination.auctionTotal : pagination.listingTotal;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left column — historical era taxonomy */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border p-4">
            <Sidebar basePath={BASE_PATH} />
          </div>
        </aside>

        {/* Main column — action bar + grid */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:p-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <label className="sr-only" htmlFor="marketplace-search">
                Search coins, banknotes, bullion
              </label>
              <div className="relative min-w-0 flex-1">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="marketplace-search"
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search coins, banknotes, bullion..."
                  className="h-11 border-slate-300 bg-background pl-10 text-base shadow-sm dark:border-slate-700"
                />
              </div>
              <Button
                type="submit"
                className="h-11 shrink-0 bg-amber-500 px-6 text-white hover:bg-amber-600"
              >
                <SearchIcon className="size-4" aria-hidden />
                Search
              </Button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div
                role="tablist"
                aria-label="Listing mode"
                className="flex flex-1 gap-1 rounded-lg border border-slate-200 bg-background p-1 dark:border-slate-800"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "fixed"}
                  onClick={() => handleTabChange("fixed")}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    activeTab === "fixed"
                      ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CoinsIcon className="size-4 shrink-0" aria-hidden />
                  Buy Now
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "auction"}
                  onClick={() => handleTabChange("auction")}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    activeTab === "auction"
                      ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <GavelIcon className="size-4 shrink-0" aria-hidden />
                  Live Auctions
                </button>
              </div>

              <Select value={sortOrder} onValueChange={handleSortChange}>
                <SelectTrigger
                  aria-label="Sort by"
                  className="h-11 w-full border-slate-300 bg-background sm:w-[14rem] dark:border-slate-700"
                >
                  <ArrowUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      Sort by: {BROWSE_SORT_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ActiveFilterPills pills={pills} basePath={BASE_PATH} />

          <p className="text-xs text-muted-foreground">
            Showing {visibleListings.length} of {totalCount} · page {pagination.page} of {totalPages}
          </p>

          <ListingGrid
            listings={visibleListings}
            emptyMessage={
              activeTab === "auction"
                ? "No live auctions match these filters."
                : "No buy-now listings match these filters."
            }
            pagination={{
              page: pagination.page,
              totalPages,
              hrefForPage,
            }}
          />
        </div>
      </div>

      <MobileFilterDrawer basePath={BASE_PATH} activeCount={pills.length} />
    </>
  );
}
