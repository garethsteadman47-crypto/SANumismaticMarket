import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CatalogPagination } from "@/components/browse/CatalogPagination";

export function ListingGrid({
  listings,
  emptyMessage,
  pagination,
}: {
  listings: ListingCardData[];
  emptyMessage?: string;
  pagination?: {
    page: number;
    totalPages: number;
    hrefForPage: (page: number) => string;
  };
}) {
  if (listings.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage ?? "No listings yet."}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard key={`${listing.type ?? "BUY_NOW"}-${listing.id}`} listing={listing} />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <CatalogPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          hrefForPage={pagination.hrefForPage}
        />
      )}
    </div>
  );
}
