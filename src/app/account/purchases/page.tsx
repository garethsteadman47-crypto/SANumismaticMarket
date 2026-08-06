import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GavelIcon, HandCoinsIcon, ImageOffIcon, ShoppingBagIcon } from "lucide-react";
import { OfferStatus } from "@prisma/client";

import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { OfferStatusAlert } from "@/components/offers/OfferStatusAlert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getAuctionPhase, getAuctionSaleOutcome } from "@/lib/auctions";
import { SITE_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { getAcceptedOfferPriceCents, getOffersForBuyer } from "@/lib/offers";
import { formatZarCents } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: `Purchases — ${SITE_NAME}`,
  description: "History of completed winning bids and buy-now purchases on MintMark.",
};

const OFFER_BADGE: Record<OfferStatus, { label: string; className: string }> = {
  PENDING: { label: "Awaiting seller", className: "bg-amber-500 text-black hover:bg-amber-500" },
  COUNTERED: { label: "Counter received", className: "bg-blue-500 text-white hover:bg-blue-500" },
  ACCEPTED: { label: "Accepted — checkout", className: "bg-emerald-600 text-white hover:bg-emerald-600" },
  DECLINED: { label: "Declined", className: "bg-secondary text-secondary-foreground" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-secondary text-secondary-foreground" },
  EXPIRED: { label: "Expired", className: "bg-secondary text-secondary-foreground" },
};

export default async function AccountPurchasesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/purchases");
  }

  const userId = session.user.id;
  const [offers, orders, leadingAuctions, bids] = await Promise.all([
    getOffersForBuyer(userId),
    db.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        listing: { select: { id: true, title: true, images: true } },
      },
    }),
    db.auction.findMany({
      where: { currentBidderId: userId },
      orderBy: { endsAt: "asc" },
      take: 20,
      include: { _count: { select: { bids: true } } },
    }),
    db.bid.findMany({
      where: { bidderId: userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        auction: {
          select: {
            id: true,
            title: true,
            images: true,
            currentBidCents: true,
            currentBidderId: true,
            reservePriceCents: true,
            isReserveMet: true,
            status: true,
            startsAt: true,
            endsAt: true,
          },
        },
      },
    }),
  ]);

  const seenAuctionIds = new Set<string>();
  const recentBidAuctions = bids.filter((bid) => {
    if (seenAuctionIds.has(bid.auctionId)) return false;
    seenAuctionIds.add(bid.auctionId);
    return !leadingAuctions.some((auction) => auction.id === bid.auctionId);
  });

  return (
    <AccountSubpageShell
      activeHref="/account/purchases"
      icon={ShoppingBagIcon}
      title="Purchases"
      description="Your offers, winning auction bids, and completed buy-now checkouts."
    >
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <HandCoinsIcon className="size-4 text-amber-600" aria-hidden />
          Your offers
        </h2>
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t made any offers yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {offers.map((offer) => {
              const cover = offer.listing.images[0];
              const badge = OFFER_BADGE[offer.status];
              return (
                <Card key={offer.id}>
                  <CardContent className="flex flex-col gap-3 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {cover ? (
                          <Image src={cover} alt="" fill className="object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <ImageOffIcon className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/listings/${offer.listing.id}`} className="font-medium hover:underline">
                          {offer.listing.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          You offered {formatZarCents(offer.offerAmountCents)}
                          {offer.status === OfferStatus.ACCEPTED
                            ? ` · checkout at ${formatZarCents(getAcceptedOfferPriceCents(offer))}`
                            : ""}
                        </p>
                      </div>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </div>
                    {(offer.status === OfferStatus.PENDING || offer.status === OfferStatus.COUNTERED) && (
                      <OfferStatusAlert
                        offerId={offer.id}
                        status={offer.status}
                        offerAmountCents={offer.offerAmountCents}
                        counterAmountCents={offer.counterAmountCents}
                      />
                    )}
                    {offer.status === OfferStatus.ACCEPTED && (
                      <Link
                        href={`/checkout/${offer.listing.id}`}
                        className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                      >
                        Continue to checkout →
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <GavelIcon className="size-4 text-amber-600" aria-hidden />
          Auction activity
        </h2>
        {leadingAuctions.length === 0 && recentBidAuctions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No auction bids yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {leadingAuctions.map((auction) => {
              const phase = getAuctionPhase(auction);
              const outcome = getAuctionSaleOutcome(auction);
              return (
                <Link
                  key={auction.id}
                  href={`/auctions/${auction.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm hover:border-amber-500/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{auction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Leading at {formatZarCents(auction.currentBidCents ?? auction.startingPriceCents)} · proxy max
                      private
                    </p>
                  </div>
                  <Badge
                    className={
                      outcome === "RESERVE_NOT_MET"
                        ? "bg-amber-500/20 text-amber-800"
                        : phase === "LIVE"
                          ? "bg-emerald-600 text-white hover:bg-emerald-600"
                          : undefined
                    }
                    variant={phase === "LIVE" || outcome === "RESERVE_NOT_MET" ? "default" : "outline"}
                  >
                    {outcome === "RESERVE_NOT_MET"
                      ? "Reserve not met"
                      : outcome === "WINNER"
                        ? "Won"
                        : phase === "LIVE"
                          ? "Leading"
                          : phase}
                  </Badge>
                </Link>
              );
            })}
            {recentBidAuctions.slice(0, 10).map((bid) => {
              const auction = bid.auction;
              const phase = getAuctionPhase(auction);
              return (
                <Link
                  key={`bid-${bid.id}`}
                  href={`/auctions/${auction.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm hover:border-amber-500/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{auction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Your max {formatZarCents(bid.maxBidCents ?? bid.amountCents)} · current{" "}
                      {formatZarCents(auction.currentBidCents ?? 0)}
                    </p>
                  </div>
                  <Badge variant="outline">{phase === "LIVE" ? "Outbid" : phase}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Completed orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed purchases yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders`}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm hover:border-amber-500/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.listing?.title ?? "Order"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatZarCents(order.itemPriceCents)} · {order.status}
                  </p>
                </div>
                <Badge variant="outline">{order.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AccountSubpageShell>
  );
}
