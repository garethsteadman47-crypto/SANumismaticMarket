import { ListingCard, type ListingCardData } from "@/components/ListingCard";

export function ListingGrid({ listings, emptyMessage }: { listings: ListingCardData[]; emptyMessage?: string }) {
  if (listings.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage ?? "No listings yet."}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
