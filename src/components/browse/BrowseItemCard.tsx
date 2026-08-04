import Image from "next/image";
import Link from "next/link";
import { GavelIcon, ImageOffIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldBadge } from "@/components/ShieldBadge";
import { SellerBadges } from "@/components/SellerBadges";
import { WishlistToggle } from "@/components/WishlistToggle";
import { CATEGORY_LABELS } from "@/lib/categories";
import type { BrowseItem } from "@/lib/browse";
import { AuctionCountdown } from "@/components/auctions/AuctionCountdown";
import { cn } from "@/lib/utils";

export function BrowseItemCard({ item, wishlisted = false }: { item: BrowseItem; wishlisted?: boolean }) {
  const isCertified = item.shieldAwarded;

  return (
    <Link href={item.href} className="group block">
      <Card
        className={cn(
          "h-full overflow-hidden transition-shadow group-hover:shadow-md",
          isCertified && "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent"
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {item.image ? (
            <Image
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
          {item.kind === "auction" && (
            <Badge className="absolute bottom-2 left-2 gap-1 bg-black/70 text-white hover:bg-black/70">
              <GavelIcon className="size-3" />
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
          <h3 className="line-clamp-2 text-sm font-medium">{item.title}</h3>
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex flex-col">
              {item.kind === "auction" && (
                <span className="text-[0.65rem] text-muted-foreground">
                  {item.bidCount && item.bidCount > 0 ? "Current bid" : "Starting bid"}
                </span>
              )}
              <span className="text-base font-semibold">{item.priceLabel}</span>
            </div>
            <SellerBadges
              seller={{
                subscriptionTier: item.sellerTier,
                isSaandDealer: item.isSaandDealer,
              }}
              compact
            />
          </div>
          {item.kind === "auction" && item.endsAtIso && (
            <AuctionCountdown
              targetIso={item.endsAtIso}
              label={item.auctionPhase === "SCHEDULED" ? "Starts in" : "Ends in"}
            />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
