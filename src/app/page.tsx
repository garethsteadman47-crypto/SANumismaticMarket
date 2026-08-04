import { AuctionStatus, ListingStatus } from "@prisma/client";
import { ShieldCheckIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";

import { db } from "@/lib/db";
import { getAuctionPhase } from "@/lib/auctions";
import { LISTING_CARD_SELECT, toListingCardData } from "@/lib/listing-card";
import { BUYER_PROTECTION_LABEL } from "@/lib/constants";
import { HomePromoBanner } from "@/components/home/HomePromoBanner";
import { HomeHero } from "@/components/home/HomeHero";
import { AuctionTicker } from "@/components/home/AuctionTicker";
import { CategoryQuickNav } from "@/components/home/CategoryQuickNav";
import { FeaturedAuctionsSection } from "@/components/home/FeaturedAuctionsSection";
import { HomeAdModules } from "@/components/home/HomeAdModules";
import { ListingSection } from "@/components/ListingSection";

export const dynamic = "force-dynamic";

const RECENT_TAKE = 8;
const FEATURED_AUCTIONS_TAKE = 6;

export default async function HomePage() {
  const now = new Date();

  const [liveAuctionRows, recentListings] = await Promise.all([
    db.auction.findMany({
      where: {
        status: { in: [AuctionStatus.LIVE, AuctionStatus.SCHEDULED] },
        endsAt: { gt: now },
      },
      orderBy: { endsAt: "asc" },
      take: FEATURED_AUCTIONS_TAKE,
      include: { _count: { select: { bids: true } } },
    }),
    db.listing.findMany({
      where: { status: ListingStatus.ACTIVE },
      orderBy: [{ isSponsored: "desc" }, { createdAt: "desc" }],
      take: RECENT_TAKE,
      select: LISTING_CARD_SELECT,
    }),
  ]);

  const featuredAuctions = liveAuctionRows
    .filter((auction) => getAuctionPhase(auction, now) === "LIVE")
    .map((auction) => ({
      id: auction.id,
      title: auction.title,
      images: auction.images,
      currentBidCents: auction.currentBidCents ?? auction.startingPriceCents,
      endsAtIso: auction.endsAt.toISOString(),
      bidCount: auction._count.bids,
    }));

  return (
    <main className="flex w-full flex-col gap-12 pb-16">
      <HomePromoBanner />
      <HomeHero />
      <AuctionTicker auctions={featuredAuctions} />
      <CategoryQuickNav />
      <FeaturedAuctionsSection auctions={featuredAuctions} />
      <HomeAdModules />

      <div className="mx-auto w-full max-w-7xl px-4">
        <ListingSection
          title="Recent additions"
          description="The newest fixed-price listings from verified sellers across the marketplace."
          viewAllHref="/listings"
          listings={recentListings.map(toListingCardData)}
          emptyMessage="No listings yet — be the first to list a coin or banknote."
        />
      </div>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:grid-cols-2">
        <Link
          href="/about"
          className="flex items-start gap-3 border border-border/80 bg-slate-50 p-5 transition-colors hover:border-amber-500/30 dark:bg-slate-950"
        >
          <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <div>
            <h3 className="font-heading text-lg font-semibold">{BUYER_PROTECTION_LABEL}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Funds held securely until delivery is confirmed — every graded lot carries independent verification.
            </p>
          </div>
        </Link>
        <Link
          href="/spot-prices"
          className="flex items-start gap-3 border border-border/80 bg-slate-50 p-5 transition-colors hover:border-amber-500/30 dark:bg-slate-950"
        >
          <TrendingUpIcon className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <div>
            <h3 className="font-heading text-lg font-semibold">Live spot prices</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Track gold (~R1,400/g) and silver (~R31/g) — use the melt calculator in Buy Coins filters while browsing.
            </p>
          </div>
        </Link>
      </section>
    </main>
  );
}
