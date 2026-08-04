"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FilterSidebar } from "@/components/browse/FilterSidebar";

/** Mobile-only floating "Filter and Sort" button opening a full-screen bottom sheet with the same filter sidebar. */
export function MobileFilterDrawer({ basePath, activeCount }: { basePath: string; activeCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 gap-2 rounded-full bg-amber-500 px-5 text-white shadow-lg hover:bg-amber-600 lg:hidden"
      >
        <SlidersHorizontalIcon className="size-4" />
        Filter and Sort
        {activeCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-amber-600">
            {activeCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter and Sort</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FilterSidebar basePath={basePath} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
