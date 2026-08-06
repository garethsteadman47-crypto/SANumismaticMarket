import Image from "next/image";
import Link from "next/link";
import { GavelIcon, ImageOffIcon } from "lucide-react";
import type { ListingCategory, ListingType, SubscriptionTier } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldBadge } from "@/components/ShieldBadge";
import { SellerBadges } from "@/components/SellerBadges";
import { WishlistToggle } from "@/components/WishlistToggle";
import { AuctionCountdown } from "@/components/auctions/AuctionCountdown";
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
  /** Fixed-price vs timed auction presentation. */
  type?: "BUY_NOW" | "AUCTION";
  href?: string;
  endsAtIso?: string;
  auctionPhase?: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  bidCount?: number;
  isSponsored?: boolean;
  /** Millisecond timestamp for newest-first sorting in the marketplace grid. */
  sortKey?: number;
  seller: { subscriptionTier: SubscriptionTier; isSaandDealer?: boolean };
}

export function ListingCard({
  listing,
  wishlisted = false,
}: {
  listing: ListingCardData;
  wishlisted?: boolean;
}) {
  const coverImage = listing.images[0];
  const isAuction = listing.type === "AUCTION";
  const isCertified = listing.listingType === "GRADED" || listing.shieldAwarded;
  const href = listing.href ?? (isAuction ? `/auctions/${listing.id}` : `/listings/${listing.id}`);

  return (
    <Link href={href} className="group block">
      <Card
        className={cn(
          "h-full overflow-hidden transition-shadow group-hover:shadow-md",
          isCertified && !listing.isSponsored && !isAuction && "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent",
          listing.isSponsored && "border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-transparent shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)]",
          isAuction &&
            "border-slate-700 bg-gradient-to-b from-slate-900/[0.03] to-transparent transition-colors hover:border-amber-500 dark:from-slate-100/[0.03]",
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
            <Badge className="absolute top-2 right-12 bg-amber-500/90 text-[0.65rem] font-semibold tracking-wide text-slate-950 uppercase hover:bg-amber-500">
              Sponsored
            </Badge>
          )}
          {isAuction && (
            <Badge className="absolute bottom-2 left-2 gap-1 bg-black/70 text-white hover:bg-black/70">
              <GavelIcon className="size-3" aria-hidden />
              {listing.auctionPhase === "LIVE" ? "Live" : "Auction"}
            </Badge>
          )}
          {!isAuction && (
            <div className="absolute top-2 right-2">
              <WishlistToggle listingId={listing.id} initialWishlisted={wishlisted} />
            </div>
          )}
        </div>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[listing.category]}</span>
          <h3 className="line-clamp-2 text-sm font-medium">
            {isAuction && <GavelIcon className="mr-1 inline size-3.5 -translate-y-px text-amber-600" aria-hidden />}
            {listing.title}
          </h3>
          {isAuction ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Current Bid
                  </span>
                  <span className="text-base font-semibold tabular-nums">{formatZarCents(listing.priceCents)}</span>
                </div>
                <SellerBadges
                  seller={{
                    subscriptionTier: listing.seller.subscriptionTier,
                    isSaandDealer: listing.seller.isSaandDealer,
                  }}
                  compact
                />
              </div>
              {listing.endsAtIso && (
                <AuctionCountdown
                  targetIso={listing.endsAtIso}
                  label={listing.auctionPhase === "SCHEDULED" ? "Starts in:" : "Ending in:"}
                  prominent
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-base font-semibold">{formatZarCents(listing.priceCents)}</span>
              <SellerBadges
                seller={{
                  subscriptionTier: listing.seller.subscriptionTier,
                  isSaandDealer: listing.seller.isSaandDealer,
                }}
                compact
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
