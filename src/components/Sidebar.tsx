"use client";

import { CategoryTree } from "@/components/browse/CategoryTree";

/**
 * Browse sidebar: taxonomy tree only — market tools live on /spot-prices.
 */
export function Sidebar({ basePath }: { basePath: string }) {
  return (
    <div className="flex flex-col gap-5">
      <CategoryTree basePath={basePath} />
    </div>
  );
}

export { CategoryTree };
