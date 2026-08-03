import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheckIcon, TruckIcon } from "lucide-react";

import { db } from "@/lib/db";
import { getHernsCatalogMetrics, getMintedValuationHistory } from "@/lib/api/valuation";
import { getProviderLabel } from "@/lib/api/verification";
import { getShippingCarrier } from "@/lib/shipping";
import { formatZarCents } from "@/lib/utils/currency";
import { CATEGORY_LABELS } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ImageGallery } from "@/components/ImageGallery";
import { ShieldBadge } from "@/components/ShieldBadge";
import { TrustBadge } from "@/components/TrustBadge";
import { ValuationChart } from "@/components/ValuationChart";

export const dynamic = "force-dynamic";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    notFound();
  }

  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true, subscriptionTier: true } },
      verification: true,
    },
  });

  if (!listing) {
    notFound();
  }

  const valuationSeedKey = listing.certificateId ?? listing.slug;
  const valuationHistory = getMintedValuationHistory(valuationSeedKey, listing.priceCents);
  const hernsMetrics = getHernsCatalogMetrics(valuationSeedKey, listing.priceCents);
  const shippingCarrier = getShippingCarrier(listing.priceCents);
  const shieldAwarded = listing.verification?.shieldAwarded ?? false;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ImageGallery images={listing.images} title={listing.title} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{CATEGORY_LABELS[listing.category]}</Badge>
            {shieldAwarded && <ShieldBadge />}
          </div>

          <h1 className="text-2xl font-semibold">{listing.title}</h1>

          <div className="flex items-center gap-2">
            <TrustBadge tier={listing.seller.subscriptionTier} />
            <span className="text-sm text-muted-foreground">Sold by {listing.seller.name ?? "a private seller"}</span>
          </div>

          <p className="text-3xl font-bold">{formatZarCents(listing.priceCents)}</p>

          <Button type="button" size="lg" nativeButton={false} render={<Link href={`/checkout/${listing.id}`} />}>
            Initiate Escrow Purchase
          </Button>

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
            <ValuationChart points={valuationHistory.points} hernsReferenceValueCents={hernsMetrics.referenceValueCents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hern&apos;s Handbook catalog reference</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
