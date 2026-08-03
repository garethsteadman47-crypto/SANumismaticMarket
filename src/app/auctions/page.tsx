import Image from "next/image";
import Link from "next/link";
import { ImageOffIcon } from "lucide-react";

import { getAuctionPhase, getAuctions, getMinimumNextBidCents } from "@/lib/auctions";
import { formatZarCents } from "@/lib/utils/currency";
import { CATEGORY_LABELS } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrustBadge } from "@/components/TrustBadge";
import { AuctionCountdown } from "@/components/auctions/AuctionCountdown";
import { PlaceBidModal } from "@/components/auctions/PlaceBidModal";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const auctions = await getAuctions();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">🔨 Live Auctions</h1>
        <p className="text-sm text-muted-foreground">
          Bid on rare coins, banknotes, and bullion in real time — every winning bid is buyer-protected like any
          other CoinVault SA purchase.
        </p>
      </div>

      {auctions.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No auctions are live right now — check back soon.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {auctions.map((auction) => {
          const phase = getAuctionPhase(auction);
          const coverImage = auction.images[0];
          const currentBidCents = auction.currentBidCents ?? auction.startingPriceCents;
          const minimumNextBidCents = getMinimumNextBidCents(auction);
          const isLive = phase === "LIVE";

          return (
            <Card key={auction.id} className="overflow-hidden">
              <Link href={`/auctions/${auction.id}`} className="relative block aspect-square w-full bg-muted">
                {coverImage ? (
                  <Image src={coverImage} alt={auction.title} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageOffIcon className="size-8" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2" variant={isLive ? "default" : "secondary"}>
                  {phase === "LIVE" ? "🔴 Live" : phase === "SCHEDULED" ? "Upcoming" : "Ended"}
                </Badge>
              </Link>
              <CardContent className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[auction.category]}</span>
                <Link href={`/auctions/${auction.id}`} className="hover:underline">
                  <h3 className="line-clamp-2 text-sm font-medium">{auction.title}</h3>
                </Link>
                <div className="flex items-center gap-2">
                  <TrustBadge tier={auction.seller.subscriptionTier} className="text-[0.6rem]" />
                  {auction._count.bids > 0 && (
                    <span className="text-xs text-muted-foreground">{auction._count.bids} bid(s)</span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {auction.currentBidCents != null ? "Current bid" : "Starting bid"}
                  </span>
                  <span className="text-lg font-semibold">{formatZarCents(currentBidCents)}</span>
                </div>
                <AuctionCountdown
                  targetIso={(phase === "SCHEDULED" ? auction.startsAt : auction.endsAt).toISOString()}
                  label={phase === "SCHEDULED" ? "Starts in" : phase === "LIVE" ? "Ends in" : ""}
                />
                <PlaceBidModal auctionId={auction.id} minimumNextBidCents={minimumNextBidCents} disabled={!isLive} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
