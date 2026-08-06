import Link from "next/link";
import { GavelIcon, ImageOffIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldBadge } from "@/components/ShieldBadge";
import { SellerBadges } from "@/components/SellerBadges";
import { WishlistToggle } from "@/components/WishlistToggle";
import { ListingImage } from "@/components/ListingImage";
import { CATEGORY_LABELS } from "@/lib/categories";
import type { BrowseItem } from "@/lib/browse";
import { AuctionCountdown } from "@/components/auctions/AuctionCountdown";
import { cn } from "@/lib/utils";

export function BrowseItemCard({ item, wishlisted = false }: { item: BrowseItem; wishlisted?: boolean }) {
  const isCertified = item.shieldAwarded;
  const isAuction = item.kind === "auction";

  return (
    <Link href={item.href} className="group block">
      <Card
        className={cn(
          "h-full overflow-hidden transition-shadow group-hover:shadow-md",
          isCertified && !isAuction && "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent",
          isAuction &&
            "border-slate-700 bg-gradient-to-b from-slate-900/[0.03] to-transparent transition-colors hover:border-amber-500 dark:from-slate-100/[0.03]",
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {item.image ? (
            <ListingImage
              src={item.image}
              alt={item.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOffIcon className="size-8" />
            </div>
          )}
          {item.shieldAwarded && (
            <div className="absolute top-2 left-2">
              <ShieldBadge />
            </div>
          )}
          {isAuction && (
            <Badge className="absolute bottom-2 left-2 gap-1 bg-black/70 text-white hover:bg-black/70">
              <GavelIcon className="size-3" aria-hidden />
              {item.auctionPhase === "LIVE" ? "Live" : "Upcoming"}
            </Badge>
          )}
          {item.kind === "listing" && (
            <div className="absolute top-2 right-2">
              <WishlistToggle listingId={item.id} initialWishlisted={wishlisted} />
            </div>
          )}
        </div>
        <CardContent className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category]}</span>
          <h3 className="line-clamp-2 text-sm font-medium">
            {isAuction && <GavelIcon className="mr-1 inline size-3.5 -translate-y-px text-amber-600" aria-hidden />}
            {item.title}
          </h3>
          {isAuction ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                    Current Bid
                  </span>
                  <span className="text-base font-semibold tabular-nums">{item.priceLabel}</span>
                </div>
                <SellerBadges
                  seller={{
                    subscriptionTier: item.sellerTier,
                    isSaandDealer: item.isSaandDealer,
                  }}
                  compact
                />
              </div>
              {item.endsAtIso && (
                <AuctionCountdown
                  targetIso={item.endsAtIso}
                  label={item.auctionPhase === "SCHEDULED" ? "Starts in:" : "Ending in:"}
                  prominent
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-base font-semibold">{item.priceLabel}</span>
              <SellerBadges
                seller={{
                  subscriptionTier: item.sellerTier,
                  isSaandDealer: item.isSaandDealer,
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
