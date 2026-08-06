"use client";

import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function pageWindow(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function CatalogPagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Catalogue pages"
      className="flex flex-wrap items-center justify-center gap-1.5 border-t pt-4"
    >
      <Link
        href={hrefForPage(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors",
          page <= 1
            ? "pointer-events-none border-transparent text-muted-foreground opacity-40"
            : "hover:border-amber-500/50 hover:bg-amber-500/5",
        )}
      >
        <ChevronLeftIcon className="size-4" aria-hidden />
        Prev
      </Link>

      {pages.map((entry, index) =>
        entry === "ellipsis" ? (
          <span key={`e-${index}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefForPage(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
              entry === page
                ? "bg-slate-900 text-white dark:bg-amber-500 dark:text-black"
                : "border hover:border-amber-500/50 hover:bg-amber-500/5",
            )}
          >
            {entry}
          </Link>
        ),
      )}

      <Link
        href={hrefForPage(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors",
          page >= totalPages
            ? "pointer-events-none border-transparent text-muted-foreground opacity-40"
            : "hover:border-amber-500/50 hover:bg-amber-500/5",
        )}
      >
        Next
        <ChevronRightIcon className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}
