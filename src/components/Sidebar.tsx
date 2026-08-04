"use client";

import { CategoryTree } from "@/components/browse/CategoryTree";
import { MarketToolsWidget } from "@/components/MarketToolsWidget";

/**
 * Browse sidebar: sticky market utilities on top, taxonomy tree beneath.
 */
export function Sidebar({ basePath }: { basePath: string }) {
  return (
    <div className="flex flex-col gap-5">
      <MarketToolsWidget />
      <CategoryTree basePath={basePath} />
    </div>
  );
}

export { CategoryTree };
