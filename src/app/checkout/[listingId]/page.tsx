import { ListingImage } from "@/components/ListingImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageOffIcon } from "lucide-react";
import { ListingStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateOrderFeeBreakdown } from "@/lib/utils/fees";
import { describePayoutVelocity } from "@/lib/utils/escrow";
import { getAcceptedOfferForBuyer, getAcceptedOfferPriceCents } from "@/lib/offers";
import { getAvailablePaymentProviders } from "@/lib/payments";
import { formatZarCents } from "@/lib/utils/currency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "@/components/TrustBadge";
import { CheckoutForm } from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export default async function CheckoutPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  if (!OBJECT_ID_PATTERN.test(listingId)) {
    notFound();
  }

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: { select: { id: true, name: true, subscriptionTier: true } },
      verification: { select: { feeCents: true, shieldAwarded: true } },
    },
  });
  if (!listing) {
    notFound();
  }

  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Sign in to continue</h1>
        <p className="text-sm text-muted-foreground">You need an account to complete a purchase.</p>
        <Button nativeButton={false} render={<Link href="/auth/signin" />}>Sign in</Button>
      </main>
    );
  }

  const isOwnListing = session.user.id === listing.sellerId;
  const isSoldOut = listing.status !== ListingStatus.ACTIVE;

  const acceptedOffer = await getAcceptedOfferForBuyer(listing.id, session.user.id);
  const effectivePriceCents = acceptedOffer ? getAcceptedOfferPriceCents(acceptedOffer) : listing.priceCents;

  const feeBreakdown = calculateOrderFeeBreakdown({
    itemPriceCents: effectivePriceCents,
    subscriptionTier: listing.seller.subscriptionTier,
    verificationFeeCents: listing.verification?.feeCents ?? 0,
  });
  const payoutCopy = describePayoutVelocity(listing.seller.subscriptionTier);
  const availableProviders = getAvailablePaymentProviders(effectivePriceCents);
  const coverImage = listing.images[0];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="text-sm text-muted-foreground">Review your order before completing your secure purchase.</p>
      </div>

      {acceptedOffer && (
        <Alert>
          <AlertTitle>Negotiated price applied</AlertTitle>
          <AlertDescription>
            You&apos;re checking out at your accepted offer price of {formatZarCents(effectivePriceCents)}, not the
            original asking price of {formatZarCents(listing.priceCents)}.
          </AlertDescription>
        </Alert>
      )}

      {isOwnListing && (
        <Alert variant="destructive">
          <AlertTitle>This is your own listing</AlertTitle>
          <AlertDescription>You can&apos;t purchase an item you&apos;re selling.</AlertDescription>
        </Alert>
      )}

      {isSoldOut && !isOwnListing && (
        <Alert variant="destructive">
          <AlertTitle>No longer available</AlertTitle>
          <AlertDescription>This item has already been sold or is pending sale to another buyer.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
              {coverImage ? (
                <ListingImage src={coverImage} alt={listing.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageOffIcon className="size-6" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
                {listing.title}
              </Link>
              <div className="flex items-center gap-2">
                <TrustBadge tier={listing.seller.subscriptionTier} className="text-[0.65rem]" />
              </div>
            </div>
            <span className="font-semibold">{formatZarCents(effectivePriceCents)}</span>
          </div>

          <Separator />

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Payout timeline for the seller</span>
            <p className="text-xs text-muted-foreground">{payoutCopy}</p>
          </div>

          <Accordion>
            <AccordionItem value="fees">
              <AccordionTrigger className="text-sm">Platform fee breakdown (informational)</AccordionTrigger>
              <AccordionContent>
                <dl className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Item price</dt>
                    <dd>{formatZarCents(feeBreakdown.itemPriceCents)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Platform commission ({(feeBreakdown.commissionRateBps / 100).toFixed(1)}%)</dt>
                    <dd>-{formatZarCents(feeBreakdown.commissionAmountCents)}</dd>
                  </div>
                  {feeBreakdown.verificationFeeCents > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Verification fee</dt>
                      <dd>-{formatZarCents(feeBreakdown.verificationFeeCents)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Output VAT (15%)</dt>
                    <dd>-{formatZarCents(feeBreakdown.platformVatCents)}</dd>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-medium">
                    <dt>Seller receives</dt>
                    <dd>{formatZarCents(feeBreakdown.sellerPayoutCents)}</dd>
                  </div>
                </dl>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />

          <div className="flex items-center justify-between text-base font-semibold">
            <span>You pay</span>
            <span>{formatZarCents(effectivePriceCents)}</span>
          </div>

          <CheckoutForm
            listingId={listing.id}
            availableProviders={availableProviders}
            disabled={isOwnListing || isSoldOut}
            offerId={acceptedOffer?.id}
          />
        </CardContent>
      </Card>
    </main>
  );
}
