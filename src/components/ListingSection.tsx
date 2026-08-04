import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { ListingGrid } from "@/components/ListingGrid";
import type { ListingCardData } from "@/components/ListingCard";

export function ListingSection({
  title,
  description,
  viewAllHref,
  listings,
  emptyMessage,
}: {
  title: string;
  description?: string;
  viewAllHref?: string;
  listings: ListingCardData[];
  emptyMessage?: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ChevronRightIcon className="size-4" />
          </Link>
        )}
      </div>
      <ListingGrid listings={listings} emptyMessage={emptyMessage} />
    </section>
  );
}
