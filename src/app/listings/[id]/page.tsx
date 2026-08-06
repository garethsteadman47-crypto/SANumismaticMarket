import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheckIcon, ShieldIcon, TruckIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getHernsCatalogMetrics, getMintedValuationHistory } from "@/lib/api/valuation";
import { getProviderLabel } from "@/lib/api/verification";
import { calculateMeltValueCents, calculatePremiumPercent, getSpotPriceQuote, isSpotTrackedMetal } from "@/lib/api/spot-prices";
import { getShippingCarrier } from "@/lib/shipping";
import { calculateTransactionFeesFromCents, normalizeCommissionTier } from "@/lib/commissionCalculator";
import { formatZarCents } from "@/lib/utils/currency";
import { CATEGORY_LABELS } from "@/lib/categories";
import { getAcceptedOfferForBuyer, getAcceptedOfferPriceCents, getOpenOfferForBuyer } from "@/lib/offers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ImageGallery } from "@/components/ImageGallery";
import { ShieldBadge } from "@/components/ShieldBadge";
import { SellerBadges } from "@/components/SellerBadges";
import { WishlistToggle } from "@/components/WishlistToggle";
import { ValuationChart } from "@/components/ValuationChart";
import { SpotPriceWidget } from "@/components/spot/SpotPriceWidget";
import { MakeOfferModal } from "@/components/offers/MakeOfferModal";
import { OfferStatusAlert } from "@/components/offers/OfferStatusAlert";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AskQuestionModal } from "@/components/messaging/AskQuestionModal";
import { ListingGrid } from "@/components/ListingGrid";
import { BuyerOrderSummary } from "@/components/checkout/BuyerOrderSummary";
import { getSimilarListings } from "@/lib/similar-listings";
import { getTaxonomyNodeLabel } from "@/lib/numismatic-taxonomy";

export const dynamic = "force-dynamic";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    notFound();
  }

  const [listing, session] = await Promise.all([
    db.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
            isSaandDealer: true,
            isCoinClubMember: true,
            completedSalesCount: true,
          },
        },
        verification: true,
      },
    }),
    auth(),
  ]);

  if (!listing) {
    notFound();
  }

  const valuationSeedKey = listing.certificateId ?? listing.slug;
  const valuationHistory = getMintedValuationHistory(valuationSeedKey, listing.priceCents);
  const hernsMetrics = getHernsCatalogMetrics(valuationSeedKey, listing.priceCents);
  const shippingCarrier = getShippingCarrier(listing.priceCents);
  const shieldAwarded = listing.verification?.shieldAwarded ?? false;

  const viewer =
    session?.user?.id != null
      ? await db.user.findUnique({
          where: { id: session.user.id },
          select: { isCoinClubMember: true, subscriptionTier: true },
        })
      : null;
  const hernsUnlocked = viewer?.isCoinClubMember === true;

  const isOwnListing = session?.user?.id === listing.sellerId;
  const isSoldOut = listing.status !== "ACTIVE";
  const buyingDisabled = isOwnListing || isSoldOut;

  const [openOffer, acceptedOffer] = session?.user
    ? await Promise.all([getOpenOfferForBuyer(listing.id, session.user.id), getAcceptedOfferForBuyer(listing.id, session.user.id)])
    : [null, null];

  const displayPriceCents = acceptedOffer ? getAcceptedOfferPriceCents(acceptedOffer) : listing.priceCents;
  const buyerTier = normalizeCommissionTier(viewer?.subscriptionTier ?? "STANDARD");
  const feePreview = calculateTransactionFeesFromCents({
    salePriceCents: displayPriceCents,
    buyerTier,
    sellerTier: listing.seller.subscriptionTier,
    certFeeCents: listing.verification?.feeCents ?? 0,
  });
  const buyerTierLabel =
    buyerTier === "STANDARD" ? "Standard" : buyerTier.charAt(0) + buyerTier.slice(1).toLowerCase();

  const similarItems = await getSimilarListings({
    listingId: listing.id,
    subcategory: listing.subcategory,
    category: listing.category,
    limit: 4,
  });
  const eraLabel = listing.subcategory
    ? getTaxonomyNodeLabel(listing.subcategory)?.split(" / ")[0] ?? "this era"
    : "this category";

  let spotWidget: { quote: ReturnType<typeof getSpotPriceQuote>; meltValueCents?: number; premiumPercent?: number } | null = null;
  if (isSpotTrackedMetal(listing.metal)) {
    const quote = getSpotPriceQuote(listing.metal);
    let meltValueCents: number | undefined;
    let premiumPercent: number | undefined;
    if (listing.weightGrams && listing.purityPercent) {
      meltValueCents = calculateMeltValueCents({
        pricePerGramCents: quote.pricePerGramCents,
        weightGrams: listing.weightGrams,
        purityPercent: listing.purityPercent,
      });
      premiumPercent = calculatePremiumPercent(listing.priceCents, meltValueCents);
    }
    spotWidget = { quote, meltValueCents, premiumPercent };
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ImageGallery images={listing.images} title={listing.title} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{CATEGORY_LABELS[listing.category]}</Badge>
            {shieldAwarded && <ShieldBadge />}
          </div>

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold">{listing.title}</h1>
            <WishlistToggle listingId={listing.id} />
          </div>

          <div className="flex flex-col gap-2">
            <SellerBadges
              seller={{
                subscriptionTier: listing.seller.subscriptionTier,
                isSaandDealer: listing.seller.isSaandDealer,
                isCoinClubMember: listing.seller.isCoinClubMember,
                completedSalesCount: listing.seller.completedSalesCount,
              }}
            />
            <span className="text-sm text-muted-foreground">Sold by {listing.seller.name ?? "a private seller"}</span>
          </div>

          <p className="text-3xl font-bold">{formatZarCents(displayPriceCents)}</p>

          {acceptedOffer && (
            <Alert>
              <AlertTitle>Your offer was accepted!</AlertTitle>
              <AlertDescription>
                You can buy this item at your negotiated price of{" "}
                {formatZarCents(getAcceptedOfferPriceCents(acceptedOffer))}.
              </AlertDescription>
            </Alert>
          )}

          {!acceptedOffer && openOffer && (
            <OfferStatusAlert
              offerId={openOffer.id}
              status={openOffer.status}
              offerAmountCents={openOffer.offerAmountCents}
              counterAmountCents={openOffer.counterAmountCents}
            />
          )}

          <BuyerOrderSummary
            itemization={{
              itemPriceCents: feePreview.salePriceCents,
              buyerTierLabel,
              buyerCommissionRatePercent: feePreview.buyerCommissionRate * 100,
              buyerFeeCents: feePreview.buyerFeeCents,
              buyerShippingShareCents: feePreview.buyerShippingShareCents,
              totalBuyerPayableCents: feePreview.totalBuyerPayableCents,
            }}
          />

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                className="bg-amber-500 text-white hover:bg-amber-600"
                disabled={buyingDisabled}
                nativeButton={false}
                render={<Link href={`/checkout/${listing.id}`} />}
              >
                Buy Now
              </Button>
              <AddToCartButton
                listingId={listing.id}
                title={listing.title}
                priceCents={listing.priceCents}
                image={listing.images[0] ?? null}
                disabled={buyingDisabled}
              />
              <div className="flex flex-row flex-wrap items-center gap-3">
                {!acceptedOffer && !openOffer && listing.acceptsOffers && (
                  <MakeOfferModal
                    listingId={listing.id}
                    listingPriceCents={listing.priceCents}
                    minOfferPriceCents={listing.minOfferPriceCents}
                    disabled={buyingDisabled}
                  />
                )}
                {!isOwnListing && (
                  <AskQuestionModal
                    listingId={listing.id}
                    listingTitle={listing.title}
                    sellerName={listing.seller.name}
                    isSignedIn={Boolean(session?.user?.id)}
                    disabled={isSoldOut}
                  />
                )}
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldIcon className="size-3.5 text-emerald-600" />
              Guaranteed Authentic | 100% Buyer Protection Guaranteed
            </p>
          </div>

          <Card>
            <CardContent className="flex items-start gap-3">
              <TruckIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Ships via {shippingCarrier.name}</span>
                <span className="text-xs text-muted-foreground">{shippingCarrier.description}</span>
                <span className="text-xs text-muted-foreground">Estimated delivery: {shippingCarrier.estimatedDays}</span>
              </div>
            </CardContent>
          </Card>

          {listing.verification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <ShieldCheckIcon className="size-4 text-emerald-600" />
                  Certificate details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Registry</dt>
                    <dd className="font-medium">{getProviderLabel(listing.verification.provider)}</dd>
                  </div>
                  {listing.verification.grade && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Grade</dt>
                      <dd className="font-medium">{listing.verification.grade}</dd>
                    </div>
                  )}
                  {listing.verification.mintage != null && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Mintage</dt>
                      <dd className="font-medium">{listing.verification.mintage.toLocaleString()}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-muted-foreground">Certificate ID</dt>
                    <dd className="font-medium">{listing.verification.certificateId}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          <Separator />

          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>
          </div>

          {(listing.year || listing.denomination || listing.condition || listing.weightGrams) && (
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {listing.year && (
                <div>
                  <dt className="text-xs text-muted-foreground">Year</dt>
                  <dd className="font-medium">{listing.year}</dd>
                </div>
              )}
              {listing.denomination && (
                <div>
                  <dt className="text-xs text-muted-foreground">Denomination</dt>
                  <dd className="font-medium">{listing.denomination}</dd>
                </div>
              )}
              {listing.condition && (
                <div>
                  <dt className="text-xs text-muted-foreground">Condition</dt>
                  <dd className="font-medium">{listing.condition}</dd>
                </div>
              )}
              {listing.weightGrams && (
                <div>
                  <dt className="text-xs text-muted-foreground">Weight</dt>
                  <dd className="font-medium">{listing.weightGrams}g</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {spotWidget && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Live Metal Spot Price</h2>
            <p className="text-sm text-muted-foreground">
              Compare this listing against the raw commodity value of its {listing.metal.toLowerCase()} content.
            </p>
          </div>
          <SpotPriceWidget
            quote={spotWidget.quote}
            metalLabel={listing.metal === "GOLD" ? "Gold (XAU/ZAR)" : "Silver (XAG/ZAR)"}
            meltValueCents={spotWidget.meltValueCents}
            premiumPercent={spotWidget.premiumPercent}
          />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Historical valuation</h2>
          <p className="text-sm text-muted-foreground">
            Quarterly auction realizations via Minted.co.za
            {valuationHistory.twelveMonthChangePercent !== 0 && (
              <>
                {" "}·{" "}
                <span className={valuationHistory.twelveMonthChangePercent > 0 ? "text-emerald-600" : "text-destructive"}>
                  {valuationHistory.twelveMonthChangePercent > 0 ? "+" : ""}
                  {valuationHistory.twelveMonthChangePercent}% over 12 months
                </span>
              </>
            )}
          </p>
        </div>

        <Card>
          <CardContent>
            <ValuationChart
              points={valuationHistory.points}
              hernsReferenceValueCents={hernsMetrics.referenceValueCents}
              mintage={listing.mintage ?? listing.verification?.mintage}
              hernsUnlocked={hernsUnlocked}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hern&apos;s Handbook catalog reference</CardTitle>
          </CardHeader>
          <CardContent>
            {hernsUnlocked ? (
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Catalog number</dt>
                  <dd className="font-medium">{hernsMetrics.catalogNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rarity rating</dt>
                  <dd className="font-medium">{hernsMetrics.rarityRating}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Reference value</dt>
                  <dd className="font-medium">{formatZarCents(hernsMetrics.referenceValueCents)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Edition</dt>
                  <dd className="font-medium">{hernsMetrics.editionYear}</dd>
                </div>
              </dl>
            ) : (
              <div className="relative overflow-hidden rounded-lg">
                <dl className="pointer-events-none grid grid-cols-2 gap-3 text-sm select-none sm:grid-cols-4 opacity-40">
                  <div>
                    <dt className="text-xs text-muted-foreground">Catalog number</dt>
                    <dd className="font-medium">••••</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Rarity rating</dt>
                    <dd className="font-medium">••••</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Reference value</dt>
                    <dd className="font-medium">••••</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Edition</dt>
                    <dd className="font-medium">••••</dd>
                  </div>
                </dl>
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95">
                  <p className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white">
                    Unlock with SA Coin Club
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {similarItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Similar Items from this Era</h2>
            <p className="text-sm text-muted-foreground">
              More active lots from {eraLabel} — keep browsing while you&apos;re here.
            </p>
          </div>
          <ListingGrid listings={similarItems} />
        </section>
      )}
    </main>
  );
}
