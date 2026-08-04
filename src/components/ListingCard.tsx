import Image from "next/image";
import Link from "next/link";
import { ImageOffIcon } from "lucide-react";
import type { ListingCategory, ListingType, SubscriptionTier } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldBadge } from "@/components/ShieldBadge";
import { TrustBadge } from "@/components/TrustBadge";
import { WishlistToggle } from "@/components/WishlistToggle";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatZarCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export interface ListingCardData {
  id: string;
  title: string;
  category: ListingCategory;
  priceCents: number;
  images: string[];
  shieldAwarded: boolean;
  listingType?: ListingType;
  isSponsored?: boolean;
  seller: { subscriptionTier: SubscriptionTier };
}

export function ListingCard({
  listing,
  wishlisted = false,
}: {
  listing: ListingCardData;
  wishlisted?: boolean;
}) {
  const coverImage = listing.images[0];
  const isCertified = listing.listingType === "GRADED" || listing.shieldAwarded;

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <Card
        className={cn(
          "h-full overflow-hidden transition-shadow group-hover:shadow-md",
          isCertified && "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent",
          listing.isSponsored && "border-slate-700/40 bg-gradient-to-b from-slate-900/[0.04] to-transparent dark:from-slate-100/[0.04]"
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOffIcon className="size-8" />
            </div>
          )}
          {listing.shieldAwarded && (
            <div className="absolute top-2 left-2">
              <ShieldBadge />
            </div>
          )}
          {listing.isSponsored && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 bg-slate-800/80 text-[0.65rem] text-slate-100"
            >
              Sponsored
            </Badge>
          )}
          <div className="absolute top-2 right-2">
            <WishlistToggle listingId={listing.id} initialWishlisted={wishlisted} />
          </div>
        </div>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[listing.category]}</span>
          <h3 className="line-clamp-2 text-sm font-medium">{listing.title}</h3>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-base font-semibold">{formatZarCents(listing.priceCents)}</span>
            <TrustBadge tier={listing.seller.subscriptionTier} className="text-[0.65rem]" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
