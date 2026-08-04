import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon, GavelIcon, ImageOffIcon, RadioIcon } from "lucide-react";

import { AuctionCountdown } from "@/components/auctions/AuctionCountdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatZarCents } from "@/lib/utils/currency";
import type { AuctionTickerItem } from "@/components/home/AuctionTicker";

/** Featured live auctions ending soonest — homepage merchandising grid. */
export function FeaturedAuctionsSection({ auctions }: { auctions: AuctionTickerItem[] }) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold">Featured auctions</h2>
          <p className="text-sm text-muted-foreground">Live lots sorted by ending soonest — bid before the hammer falls.</p>
        </div>
        <Link
          href="/auctions"
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      {auctions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border border-dashed py-12 text-center text-sm text-muted-foreground">
          <GavelIcon className="size-6 text-muted-foreground/70" aria-hidden />
          No live auctions at the moment. Browse fixed-price listings or check back shortly.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((auction) => {
            const cover = auction.images[0];
            return (
              <Card key={auction.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <Link href={`/auctions/${auction.id}`} className="relative block aspect-[4/3] bg-muted">
                  {cover ? (
                    <Image src={cover} alt={auction.title} fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageOffIcon className="size-8" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 gap-1 bg-red-600 text-white hover:bg-red-600">
                    <RadioIcon className="size-3 animate-pulse" aria-hidden />
                    Live
                  </Badge>
                </Link>
                <CardContent className="flex flex-col gap-2">
                  <Link href={`/auctions/${auction.id}`} className="hover:underline">
                    <h3 className="line-clamp-2 font-heading text-base font-semibold">{auction.title}</h3>
                  </Link>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {auction.bidCount > 0 ? "Current bid" : "Starting bid"}
                    </span>
                    <span className="font-sans text-lg font-semibold">{formatZarCents(auction.currentBidCents)}</span>
                  </div>
                  <AuctionCountdown targetIso={auction.endsAtIso} label="Ends in" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
