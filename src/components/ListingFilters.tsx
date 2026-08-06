"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheckIcon } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ITEM_TYPE_LABELS,
  ITEM_TYPES,
  parseBrowseFilters,
  serializeBrowseFilters,
  type ItemType,
} from "@/lib/browse-filters";
import { cn } from "@/lib/utils";

/**
 * Cross-cutting browse facets: Coins vs Banknotes item type, plus
 * Verified Dealers Only. Lives alongside the category tree in `Sidebar`.
 */
export function ListingFilters({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseBrowseFilters(Object.fromEntries(searchParams.entries()));

  function navigate(next: Partial<typeof filters>) {
    const query = serializeBrowseFilters({ ...filters, ...next, page: 1 });
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  function setItemType(next: ItemType | undefined) {
    navigate({ itemType: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">Item type</legend>
        <p className="text-xs text-muted-foreground">Toggle coins or banknotes across every category.</p>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {ITEM_TYPES.map((type) => {
            const active = filters.itemType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setItemType(active ? undefined : type)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={active}
              >
                {ITEM_TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="verified-dealers-only"
            checked={filters.verifiedOnly === true}
            onCheckedChange={(value) => navigate({ verifiedOnly: value === true ? true : undefined })}
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <Label
              htmlFor="verified-dealers-only"
              className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold"
            >
              <BadgeCheckIcon className="size-3.5 text-amber-600" aria-hidden />
              Verified Dealers Only
            </Label>
            <p className="text-xs text-muted-foreground">
              Show listings from verified sellers or Silver / Gold members.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
