import Link from "next/link";
import { BookmarkIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { listWishlist } from "@/lib/wishlist";
import { toListingCardData } from "@/lib/listing-card";
import { ListingGrid } from "@/components/ListingGrid";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <BookmarkIcon className="size-8 text-muted-foreground" />
        <h1 className="font-heading text-2xl font-semibold">Your wishlist</h1>
        <p className="text-sm text-muted-foreground">Sign in to save coins and revisit them later.</p>
        <Button nativeButton={false} render={<Link href="/login" />}>
          Sign in
        </Button>
      </main>
    );
  }

  const items = await listWishlist(session.user.id);
  const listings = items
    .filter((item) => item.listing.status === "ACTIVE")
    .map((item) => toListingCardData(item.listing));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">Wishlist</h1>
        <p className="text-sm text-muted-foreground">
          Bookmarked lots you&apos;re watching. Silver+ members get match notifications.
        </p>
      </div>
      <ListingGrid
        listings={listings.map((l) => ({ ...l }))}
        emptyMessage="No saved items yet — tap the bookmark on any listing card."
      />
    </main>
  );
}
