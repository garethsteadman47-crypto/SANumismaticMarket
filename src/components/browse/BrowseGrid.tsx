import type { BrowseItem } from "@/lib/browse";
import { BrowseItemCard } from "@/components/browse/BrowseItemCard";

export function BrowseGrid({ items }: { items: BrowseItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <BrowseItemCard key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
