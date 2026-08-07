import type { Metadata } from "next";
import { ListingImage } from "@/components/ListingImage";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheetIcon, GavelIcon, HandCoinsIcon, ImageOffIcon, TagIcon } from "lucide-react";
import { OfferStatus, SubscriptionTier } from "@prisma/client";

import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { OfferRespondControls } from "@/components/offers/OfferRespondControls";
import { InvoiceDownloadButton } from "@/components/orders/InvoiceDownloadButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getAuctionPhase, getAuctionSaleOutcome, isReserveSatisfied } from "@/lib/auctions";
import { SITE_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { getOffersForSeller } from "@/lib/offers";
import { formatZarCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Sales — ${SITE_NAME}`,
  description: "Manage active listings, pending bids, and past sales on MintMark.",
};

const OFFER_BADGE: Record<OfferStatus, { label: string; className: string }> = {
  PENDING: { label: "Needs response", className: "bg-amber-500 text-black hover:bg-amber-500" },
  COUNTERED: { label: "Awaiting buyer", className: "bg-blue-500 text-white hover:bg-blue-500" },
  ACCEPTED: { label: "Accepted", className: "bg-emerald-600 text-white hover:bg-emerald-600" },
  DECLINED: { label: "Declined", className: "bg-secondary text-secondary-foreground" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-secondary text-secondary-foreground" },
  EXPIRED: { label: "Expired", className: "bg-secondary text-secondary-foreground" },
};

export default async function AccountSalesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/sales");
  }

  const userId = session.user.id;
  const [user, offers, listings, auctions, soldOrders] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, isSaandDealer: true },
    }),
    getOffersForSeller(userId),
    db.listing.findMany({
      where: { sellerId: userId, status: { in: ["ACTIVE", "SOLD", "PENDING_SALE"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        images: true,
        priceCents: true,
        status: true,
        acceptsOffers: true,
      },
    }),
    db.auction.findMany({
      where: { sellerId: userId },
      orderBy: { endsAt: "desc" },
      take: 20,
      include: {
        currentBidder: { select: { name: true } },
        _count: { select: { bids: true } },
      },
    }),
    db.order.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        listing: { select: { id: true, title: true } },
        invoices: { select: { id: true, type: true } },
      },
    }),
  ]);

  const canBulkImport =
    user?.subscriptionTier === SubscriptionTier.DEALER ||
    user?.subscriptionTier === SubscriptionTier.GOLD ||
    user?.isSaandDealer === true;

  const pendingOffers = offers.filter((offer) => offer.status === OfferStatus.PENDING);
  const otherOffers = offers.filter((offer) => offer.status !== OfferStatus.PENDING).slice(0, 8);

  return (
    <AccountSubpageShell
      activeHref="/account/sales"
      icon={TagIcon}
      title="Sales"
      description="Active listings you manage, pending offers and bids, plus a ledger of past sales and payouts."
    >
      {canBulkImport && (
        <Link
          href="/account/sales/bulk"
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-fit bg-amber-500 font-semibold text-black hover:bg-amber-400",
          )}
        >
          <FileSpreadsheetIcon className="size-4" aria-hidden />
          Bulk CSV Upload
        </Link>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <HandCoinsIcon className="size-4 text-amber-600" aria-hidden />
            Incoming offers
          </h2>
          <Link href="/dashboard/offers" className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400">
            Open full offers desk →
          </Link>
        </div>
        {pendingOffers.length === 0 && otherOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No offers on your listings yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...pendingOffers, ...otherOffers].map((offer) => {
              const cover = offer.listing.images[0];
              const badge = OFFER_BADGE[offer.status];
              return (
                <Card key={offer.id}>
                  <CardContent className="flex flex-col gap-3 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {cover ? (
                          <ListingImage src={cover} alt="" fill className="object-cover" />
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
                          {offer.buyer.name ?? offer.buyer.email} offered {formatZarCents(offer.offerAmountCents)}
                          {offer.counterAmountCents != null
                            ? ` · countered at ${formatZarCents(offer.counterAmountCents)}`
                            : ""}
                        </p>
                      </div>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </div>
                    {offer.status === OfferStatus.PENDING && (
                      <OfferRespondControls offerId={offer.id} listingPriceCents={offer.listing.priceCents} />
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
          Your auctions
        </h2>
        {auctions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No auctions listed yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {auctions.map((auction) => {
              const phase = getAuctionPhase(auction);
              const outcome = getAuctionSaleOutcome(auction);
              const reserveMet = isReserveSatisfied(auction);
              return (
                <Link
                  key={auction.id}
                  href={`/auctions/${auction.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm hover:border-amber-500/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{auction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {auction._count.bids} bid{auction._count.bids === 1 ? "" : "s"} ·{" "}
                      {formatZarCents(auction.currentBidCents ?? auction.startingPriceCents)}
                      {auction.reservePriceCents != null
                        ? reserveMet
                          ? " · Reserve met"
                          : " · Reserve not met"
                        : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {outcome === "RESERVE_NOT_MET"
                      ? "Reserve not met"
                      : phase === "LIVE"
                        ? "Live"
                        : phase === "ENDED"
                          ? "Ended"
                          : phase}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Buy Now listings</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fixed-price listings yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm hover:border-amber-500/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{listing.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatZarCents(listing.priceCents)}
                    {listing.acceptsOffers ? " · Accepting offers" : ""}
                  </p>
                </div>
                <Badge variant="outline">{listing.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">Completed sales &amp; invoices</h2>
        {soldOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed sales yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {soldOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-2 rounded-lg border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.listing?.title ?? "Sale"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatZarCents(order.itemPriceCents)} · {order.status}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{order.status}</Badge>
                  {order.invoices.length > 0 && (
                    <>
                      <InvoiceDownloadButton
                        orderId={order.id}
                        type="PLATFORM_TO_SELLER"
                        label="Platform invoice"
                      />
                      <InvoiceDownloadButton
                        orderId={order.id}
                        type="SELLER_TO_BUYER"
                        label="Buyer invoice"
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AccountSubpageShell>
  );
}
