import { notFound } from "next/navigation";
import { AdSlotType, ListingStatus, Prisma, SubscriptionTier, VerificationProvider } from "@prisma/client";

import { db } from "@/lib/db";
import { getActiveAdPlacements } from "@/lib/ads";
import { categoryFromSlug, CATEGORY_DESCRIPTIONS, CATEGORY_LABELS } from "@/lib/categories";
import { LISTING_CARD_SELECT, toListingCardData } from "@/lib/listing-card";
import { randsToCents } from "@/lib/utils/currency";
import { CategoryBanners } from "@/components/ads/CategoryBanners";
import { CategoryFilters } from "@/components/CategoryFilters";
import { ListingGrid } from "@/components/ListingGrid";

export const dynamic = "force-dynamic";

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) {
    notFound();
  }

  const sp = await searchParams;
  const gradingAgency = firstString(sp.gradingAgency);
  const grade = firstString(sp.grade);
  const minPriceRands = firstString(sp.minPrice);
  const maxPriceRands = firstString(sp.maxPrice);
  const sellerTier = firstString(sp.sellerTier);

  const where: Prisma.ListingWhereInput = { status: ListingStatus.ACTIVE, category };

  if (minPriceRands || maxPriceRands) {
    where.priceCents = {
      ...(minPriceRands ? { gte: randsToCents(Number(minPriceRands)) } : {}),
      ...(maxPriceRands ? { lte: randsToCents(Number(maxPriceRands)) } : {}),
    };
  }

  const verificationWhere: Prisma.VerificationWhereInput = {};
  if (gradingAgency && Object.values(VerificationProvider).includes(gradingAgency as VerificationProvider)) {
    verificationWhere.provider = gradingAgency as VerificationProvider;
  }
  if (grade) {
    verificationWhere.grade = { contains: grade };
  }
  if (Object.keys(verificationWhere).length > 0) {
    where.verification = verificationWhere;
  }

  if (sellerTier && Object.values(SubscriptionTier).includes(sellerTier as SubscriptionTier)) {
    where.seller = { subscriptionTier: sellerTier as SubscriptionTier };
  }

  const [bannerSlots, listings] = await Promise.all([
    getActiveAdPlacements(AdSlotType.CATEGORY_BANNER, category),
    db.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      select: LISTING_CARD_SELECT,
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{CATEGORY_LABELS[category]}</h1>
        <p className="text-sm text-muted-foreground">{CATEGORY_DESCRIPTIONS[category]}</p>
      </div>

      <CategoryBanners slots={bannerSlots} />

      <CategoryFilters
        basePath={`/category/${slug}`}
        initialValues={{ gradingAgency, grade, minPrice: minPriceRands, maxPrice: maxPriceRands, sellerTier }}
      />

      <ListingGrid
        listings={listings.map(toListingCardData)}
        emptyMessage="No listings match your filters yet. Try clearing a filter or check back soon."
      />
    </main>
  );
}
