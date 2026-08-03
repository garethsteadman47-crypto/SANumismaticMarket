import Link from "next/link";
import { ListingStatus, Prisma, SubscriptionTier, VerificationProvider } from "@prisma/client";

import { db } from "@/lib/db";
import { ALL_CATEGORIES, CATEGORY_LABELS, CATEGORY_SLUGS } from "@/lib/categories";
import { LISTING_CARD_SELECT, toListingCardData } from "@/lib/listing-card";
import { randsToCents } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { CategoryFilters } from "@/components/CategoryFilters";
import { ListingGrid } from "@/components/ListingGrid";

export const dynamic = "force-dynamic";

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The general "Buy Coins" catalog — all active listings across every category, with the same filter set as `/category/[slug]`. */
export default async function BuyCoinsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const gradingAgency = firstString(sp.gradingAgency);
  const grade = firstString(sp.grade);
  const minPriceRands = firstString(sp.minPrice);
  const maxPriceRands = firstString(sp.maxPrice);
  const sellerTier = firstString(sp.sellerTier);

  const where: Prisma.ListingWhereInput = { status: ListingStatus.ACTIVE };

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

  const listings = await db.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    select: LISTING_CARD_SELECT,
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Buy Coins</h1>
        <p className="text-sm text-muted-foreground">
          Browse every verified, buyer-protected listing across coins, banknotes, bullion, and Krugerrands.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((category) => (
          <Link key={category} href={`/category/${CATEGORY_SLUGS[category]}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              {CATEGORY_LABELS[category]}
            </Badge>
          </Link>
        ))}
      </div>

      <CategoryFilters
        basePath="/listings"
        initialValues={{ gradingAgency, grade, minPrice: minPriceRands, maxPrice: maxPriceRands, sellerTier }}
      />

      <ListingGrid
        listings={listings.map(toListingCardData)}
        emptyMessage="No listings match your filters yet. Try clearing a filter or check back soon."
      />
    </main>
  );
}
