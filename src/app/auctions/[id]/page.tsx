import { notFound } from "next/navigation";
import { GavelIcon, RadioIcon, ShieldIcon } from "lucide-react";

import { getAuctionById, getAuctionPhase, getMinimumNextBidCents } from "@/lib/auctions";
import { formatZarCents } from "@/lib/utils/currency";
import { CATEGORY_LABELS } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ImageGallery } from "@/components/ImageGallery";
import { TrustBadge } from "@/components/TrustBadge";
import { AuctionCountdown } from "@/components/auctions/AuctionCountdown";
import { PlaceBidModal } from "@/components/auctions/PlaceBidModal";

export const dynamic = "force-dynamic";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    notFound();
  }

  const auction = await getAuctionById(id);
  if (!auction) {
    notFound();
  }

  const phase = getAuctionPhase(auction);
  const isLive = phase === "LIVE";
  const currentBidCents = auction.currentBidCents ?? auction.startingPriceCents;
  const minimumNextBidCents = getMinimumNextBidCents(auction);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ImageGallery images={auction.images} title={auction.title} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{CATEGORY_LABELS[auction.category]}</Badge>
            <Badge
              className={isLive ? "gap-1 bg-red-600 text-white hover:bg-red-600" : ""}
              variant={isLive ? "default" : "secondary"}
            >
              {phase === "LIVE" ? (
                <>
                  <RadioIcon className="size-3 animate-pulse" aria-hidden />
                  Live
                </>
              ) : phase === "SCHEDULED" ? (
                "Upcoming"
              ) : phase === "ENDED" ? (
                "Ended"
              ) : (
                "Cancelled"
              )}
            </Badge>
          </div>

          <h1 className="text-2xl font-semibold">{auction.title}</h1>

          <div className="flex items-center gap-2">
            <TrustBadge tier={auction.seller.subscriptionTier} />
            <span className="text-sm text-muted-foreground">Sold by {auction.seller.name ?? "a private seller"}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {auction.currentBidCents != null ? "Current bid" : "Starting bid"}
            </span>
            <p className="text-3xl font-bold">{formatZarCents(currentBidCents)}</p>
            {auction.currentBidder && (
              <span className="text-xs text-muted-foreground">Leading bidder: {auction.currentBidder.name ?? "Anonymous"}</span>
            )}
          </div>

          <AuctionCountdown
            targetIso={(phase === "SCHEDULED" ? auction.startsAt : auction.endsAt).toISOString()}
            label={phase === "SCHEDULED" ? "Starts in" : "Ends in"}
          />

          <PlaceBidModal auctionId={auction.id} minimumNextBidCents={minimumNextBidCents} disabled={!isLive} />

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldIcon className="size-3.5 text-emerald-600" />
            Guaranteed Authentic | 100% Buyer Protection Guaranteed
          </p>

          <Separator />

          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{auction.description}</p>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5">
          <GavelIcon className="size-4" />
          <h2 className="text-xl font-semibold">Bid history</h2>
        </div>

        {auction.bids.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bids yet — be the first.</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most recent {auction.bids.length} bid(s)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {auction.bids.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{bid.bidder.name ?? "Anonymous bidder"}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatZarCents(bid.amountCents)}</span>
                    <span className="text-xs text-muted-foreground">{bid.createdAt.toLocaleString("en-ZA")}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
