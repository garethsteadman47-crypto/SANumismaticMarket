import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ListingStatus } from "@prisma/client";

import { AccountDashboard } from "@/components/account/AccountDashboard";
import { auth } from "@/lib/auth";
import { LISTING_CARD_SELECT, toListingCardData } from "@/lib/listing-card";
import { listWishlist } from "@/lib/wishlist";
import { db } from "@/lib/db";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `My Account — ${SITE_NAME}`,
  description: "Your MintMark collector profile, listings, purchases, and wishlist.",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const userId = session.user.id;

  const [user, activeListings, orders, wishlistRows] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
        bio: true,
        location: true,
        avatarUrl: true,
        bannerUrl: true,
        image: true,
        accolades: true,
      },
    }),
    db.listing.findMany({
      where: { sellerId: userId, status: ListingStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      select: LISTING_CARD_SELECT,
    }),
    db.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        status: true,
        itemPriceCents: true,
        createdAt: true,
        listing: { select: { id: true, title: true, images: true } },
      },
    }),
    listWishlist(userId),
  ]);

  if (!user) {
    redirect("/login");
  }

  const wishlist = wishlistRows
    .filter((row) => row.listing.status === "ACTIVE")
    .map((row) => toListingCardData(row.listing));

  return (
    <Suspense fallback={<div className="min-h-[50vh] bg-slate-950" />}>
      <AccountDashboard
        profile={{
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          bio: user.bio,
          location: user.location,
          avatarUrl: user.avatarUrl ?? user.image,
          bannerUrl: user.bannerUrl,
          accolades: user.accolades,
        }}
        activeListings={activeListings.map(toListingCardData)}
        purchases={orders.map((order) => ({
          id: order.id,
          status: order.status,
          totalCents: order.itemPriceCents,
          createdAt: order.createdAt.toISOString(),
          listing: order.listing,
        }))}
        wishlist={wishlist}
      />
    </Suspense>
  );
}
