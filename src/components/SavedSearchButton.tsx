"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellIcon, Loader2Icon } from "lucide-react";

import { saveStructuredSearchAction } from "@/actions/saved-search";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  serializeBrowseFilters,
  type BrowseFilterState,
} from "@/lib/browse-filters";

/**
 * Saves the current browse filters as a Key Date alert.
 * Used in the marketplace action bar next to search/sort.
 */
export function SavedSearchButton({ filters }: { filters: BrowseFilterState }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const queryString = serializeBrowseFilters(filters);
  const defaultName =
    [filters.taxonomy, filters.q, filters.minYear && String(filters.minYear)]
      .filter(Boolean)
      .join(" · ") || "My key-date alert";

  function handleSave() {
    startTransition(async () => {
      const result = await saveStructuredSearchAction({
        queryName: name.trim() || defaultName,
        era: filters.taxonomy,
        keyword: filters.q,
        minPrice: filters.minPriceRands,
        maxPrice: filters.maxPriceRands,
        grade: filters.gradeBrackets[0],
        queryString,
        filters,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Search saved — we'll alert you when matching lots appear.");
      setOpen(false);
      setName("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" />}
      >
        <BellIcon className="size-3.5" aria-hidden />
        Save alert
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save search &amp; key-date alert</DialogTitle>
          <DialogDescription>
            We&apos;ll watch for new Buy Now listings that match these filters (era, keyword, grade,
            price) and flag them in the alert engine.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="saved-search-name">Alert name</Label>
          <Input
            id="saved-search-name"
            placeholder={defaultName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
          />
          <p className="text-xs text-muted-foreground">
            {[filters.taxonomy, filters.q, filters.gradeBrackets.join(", "), filters.minPriceRands != null || filters.maxPriceRands != null
              ? `R${filters.minPriceRands ?? 0}–R${filters.maxPriceRands ?? "∞"}`
              : null]
              .filter(Boolean)
              .join(" · ") || "Current browse filters"}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : <BellIcon />}
            Save alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
