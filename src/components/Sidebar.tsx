"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { CategoryTree } from "@/components/browse/CategoryTree";
import { ListingFilters } from "@/components/ListingFilters";
import { Separator } from "@/components/ui/separator";
import { HISTORICAL_ERA_IDS } from "@/lib/numismatic-taxonomy";

/**
 * Shared category taxonomy sidebar for the unified marketplace.
 * Primary navigation is the six strict South African historical eras,
 * followed by International Coins & Banknotes and secondary sections.
 * Selecting a node updates `?category=` + `?taxonomy=` while preserving
 * the active Buy Now / Live Auctions tab, search query, and sort order.
 * Page resets to 1 on category change.
 */
export function Sidebar({ basePath }: { basePath: string }) {
  return (
    <div className="flex flex-col gap-5">
      <ListingFilters basePath={basePath} />

      <Separator />

      <div className="flex flex-col gap-1 px-1">
        <h3 className="text-sm font-semibold">Categories</h3>
        <p className="text-xs text-muted-foreground">
          SA historical eras, international coins and banknotes, bullion, and sets.
        </p>
      </div>
      <CategoryTree basePath={basePath} preferredRootIds={[...HISTORICAL_ERA_IDS, "international"]} />
    </div>
  );
}

export { CategoryTree };

/** Soft-navigate helper used by category links — preserves tab state via current search params. */
export function useMarketplaceCategoryNavigate(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (categoryId: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) {
      params.set("taxonomy", categoryId);
      params.set("category", categoryId);
    } else {
      params.delete("taxonomy");
      params.delete("category");
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };
}
