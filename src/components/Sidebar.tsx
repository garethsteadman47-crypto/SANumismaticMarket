"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { CategoryTree } from "@/components/browse/CategoryTree";

/**
 * Shared category taxonomy sidebar for the unified marketplace.
 * Selecting a node updates URL params (taxonomy + category) while preserving
 * the active Buy Now / Live Auctions tab, search query, and sort order.
 */
export function Sidebar({ basePath }: { basePath: string }) {
  return (
    <div className="flex flex-col gap-5">
      <CategoryTree basePath={basePath} />
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
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };
}
