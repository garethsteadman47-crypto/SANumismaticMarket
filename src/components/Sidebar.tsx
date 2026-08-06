"use client";

import { CategoryTree } from "@/components/browse/CategoryTree";

/**
 * Shared category taxonomy sidebar for Buy Now and Auction browse modes.
 * Selecting Union → Farthings (etc.) preserves the active tab via URL filters.
 */
export function Sidebar({ basePath }: { basePath: string }) {
  return (
    <div className="flex flex-col gap-5">
      <CategoryTree basePath={basePath} />
    </div>
  );
}

export { CategoryTree };
