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
import {
  BROWSE_SORT_LABELS,
  parseBrowseFilters,
  resolveBrowseSort,
  serializeBrowseFilters,
  type BrowseFilterState,
  type BrowseSort,
  type BuyingFormat,
} from "@/lib/browse-filters";
import { cn } from "@/lib/utils";

type BrowseMode = "BUY_NOW" | "AUCTION";

function resolveMode(formats: BuyingFormat[]): BrowseMode {
  const auctionOnly = formats.length === 1 && formats[0] === "AUCTION";
  return auctionOnly ? "AUCTION" : "BUY_NOW";
}

function modeFormats(mode: BrowseMode): BuyingFormat[] {
  return mode === "AUCTION" ? ["AUCTION"] : ["BUY_NOW"];
}

function defaultSortForMode(mode: BrowseMode): BrowseSort {
  return mode === "AUCTION" ? "ending_soon" : "newest";
}

/**
 * Prominent catalogue search, sort dropdown, and Buy Now / Auction mode tabs.
 * Search and taxonomy filters run within the active tab; Auction defaults to Ending Soonest.
 */
export function BrowseSearchTabs({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseBrowseFilters(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const mode = resolveMode(filters.formats);
  const sort = resolveBrowseSort({ ...filters, formats: modeFormats(mode) });
  const [query, setQuery] = useState(filters.q ?? "");

  useEffect(() => {
    setQuery(filters.q ?? "");
  }, [filters.q]);

  function navigate(next: BrowseFilterState) {
    const qs = serializeBrowseFilters(next);
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate({
      ...filters,
      q: trimmed || undefined,
      formats: modeFormats(mode),
      sort: filters.sort ?? defaultSortForMode(mode),
    });
  }

  function handleModeChange(nextMode: BrowseMode) {
    const nextSort = defaultSortForMode(nextMode);
    navigate({
      ...filters,
      // Clear listing-only facets when entering Auction so category filters stay effective.
      certifications: nextMode === "AUCTION" ? [] : filters.certifications,
      gradeBrackets: nextMode === "AUCTION" ? [] : filters.gradeBrackets,
      minYear: nextMode === "AUCTION" ? undefined : filters.minYear,
      maxYear: nextMode === "AUCTION" ? undefined : filters.maxYear,
      formats: modeFormats(nextMode),
      sort: nextSort,
    });
  }

  function handleSortChange(nextSort: string | null) {
    if (!nextSort) return;
    navigate({
      ...filters,
      formats: modeFormats(mode),
      sort: nextSort as BrowseSort,
    });
  }

  const sortOptions: BrowseSort[] =
    mode === "AUCTION"
      ? ["ending_soon", "newest", "price_asc", "price_desc"]
      : ["newest", "price_asc", "price_desc"];

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        <label className="sr-only" htmlFor="browse-search">
          Search {mode === "AUCTION" ? "auctions" : "buy now listings"}
        </label>
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="browse-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              mode === "AUCTION"
                ? "Search live auctions by coin, year, or grade…"
                : "Search buy-now listings by coin, year, or grade…"
            }
            className="h-11 border-slate-300 pl-10 text-base shadow-sm dark:border-slate-700"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger
              aria-label="Sort listings"
              className="h-11 min-w-[11.5rem] border-slate-300 bg-background dark:border-slate-700"
            >
              <ArrowUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {BROWSE_SORT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            className="h-11 shrink-0 bg-amber-500 px-6 text-white hover:bg-amber-600"
          >
            <SearchIcon className="size-4" aria-hidden />
            Search
          </Button>
        </div>
      </form>

      <div
        role="tablist"
        aria-label="Listing mode"
        className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/60"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "BUY_NOW"}
          onClick={() => handleModeChange("BUY_NOW")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            mode === "BUY_NOW"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CoinsIcon className="size-4 shrink-0" aria-hidden />
          Buy Now
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "AUCTION"}
          onClick={() => handleModeChange("AUCTION")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            mode === "AUCTION"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <GavelIcon className="size-4 shrink-0" aria-hidden />
          Auction
        </button>
      </div>
    </div>
  );
}
