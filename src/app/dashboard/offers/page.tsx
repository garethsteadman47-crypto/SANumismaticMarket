import Image from "next/image";
import Link from "next/link";
import { ImageOffIcon } from "lucide-react";
import { OfferStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { getOffersForSeller } from "@/lib/offers";
import { formatZarCents } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfferRespondControls } from "@/components/offers/OfferRespondControls";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<OfferStatus, { label: string; className: string }> = {
  PENDING: { label: "New offer", className: "bg-amber-500 text-white hover:bg-amber-500" },
  COUNTERED: { label: "Countered — awaiting buyer", className: "bg-blue-500 text-white hover:bg-blue-500" },
  ACCEPTED: { label: "Accepted", className: "bg-emerald-600 text-white hover:bg-emerald-600" },
  DECLINED: { label: "Declined", className: "bg-secondary text-secondary-foreground" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-secondary text-secondary-foreground" },
};

export default async function SellerOffersDashboard() {
  const session = await auth();
  if (!session?.user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">Sign in to view offers on your listings.</p>
        <Button nativeButton={false} render={<Link href="/auth/signin" />}>
          Sign in
        </Button>
      </main>
    );
  }

  const offers = await getOffersForSeller(session.user.id);
  const pending = offers.filter((offer) => offer.status === OfferStatus.PENDING);
  const others = offers.filter((offer) => offer.status !== OfferStatus.PENDING);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Offers on Your Listings</h1>
        <p className="text-sm text-muted-foreground">Accept, counter, or decline offers buyers have made.</p>
      </div>

      {offers.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No offers yet.</p>
      )}

      {[...pending, ...others].map((offer) => {
        const coverImage = offer.listing.images[0];
        const badge = STATUS_BADGE[offer.status];
        return (
          <Card key={offer.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {coverImage ? (
                    <Image src={coverImage} alt={offer.listing.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageOffIcon className="size-5" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <Link href={`/listings/${offer.listing.id}`} className="font-medium hover:underline">
                    {offer.listing.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    From {offer.buyer.name ?? offer.buyer.email} · Asking {formatZarCents(offer.listing.priceCents)}
                  </span>
                </div>
                <Badge className={badge.className}>{badge.label}</Badge>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">{formatZarCents(offer.offerAmountCents)}</span>
                {offer.counterAmountCents != null && (
                  <span className="text-sm text-muted-foreground">
                    → countered at {formatZarCents(offer.counterAmountCents)}
                  </span>
                )}
              </div>

              {offer.message && <p className="text-sm text-muted-foreground">&quot;{offer.message}&quot;</p>}

              {offer.status === OfferStatus.PENDING && (
                <OfferRespondControls offerId={offer.id} listingPriceCents={offer.listing.priceCents} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </main>
  );
}
