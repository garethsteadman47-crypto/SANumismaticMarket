"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPinIcon, PencilIcon, ImageOffIcon } from "lucide-react";

import { EditProfileModal, type EditableProfile } from "@/components/EditProfileModal";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveAccolades, profileHandle } from "@/lib/accolades";
import { formatZarCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

export type AccountPurchase = {
  id: string;
  status: string;
  totalCents: number;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    images: string[];
  };
};

export type AccountProfile = {
  name: string | null;
  email: string;
  phoneNumber: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  accolades: string[];
};

export function AccountDashboard({
  profile,
  activeListings,
  purchases,
  wishlist,
}: {
  profile: AccountProfile;
  activeListings: ListingCardData[];
  purchases: AccountPurchase[];
  wishlist: ListingCardData[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("edit") === "1") setEditOpen(true);
  }, [searchParams]);

  function handleEditOpenChange(open: boolean) {
    setEditOpen(open);
    if (!open && searchParams.get("edit") === "1") {
      router.replace("/account");
    }
  }

  const badges = useMemo(() => resolveAccolades(profile.accolades), [profile.accolades]);
  const handle = profileHandle(profile.name, profile.email);
  const displayName = profile.name?.trim() || "MintMark collector";
  const avatarSrc = profile.avatarUrl;
  const bannerSrc = profile.bannerUrl;

  const editable: EditableProfile = {
    name: profile.name ?? "",
    phoneNumber: profile.phoneNumber ?? "",
    location: profile.location ?? "",
    bio: profile.bio ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    bannerUrl: profile.bannerUrl ?? "",
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      {/* Hero banner */}
      <div className="relative">
        <div className="relative h-48 w-full overflow-hidden sm:h-64 md:h-72">
          {bannerSrc ? (
            <Image src={bannerSrc} alt="" fill priority className="object-cover" sizes="100vw" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(148,163,184,0.12),transparent_40%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4">
          <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-950 bg-slate-800 shadow-xl shadow-black/40 sm:size-32">
                {avatarSrc ? (
                  <Image src={avatarSrc} alt={displayName} fill className="object-cover" sizes="128px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 font-heading text-3xl font-semibold text-amber-200">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="pb-1">
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-amber-200/90">{handle}</p>
                {profile.location && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-400">
                    <MapPinIcon className="size-3.5 text-slate-500" />
                    {profile.location}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="mb-1 w-fit border-slate-600 bg-slate-950/60 text-slate-100 hover:border-amber-500/60 hover:bg-slate-900 hover:text-amber-50"
              onClick={() => handleEditOpenChange(true)}
            >
              <PencilIcon />
              Edit Profile
            </Button>
          </div>

          {profile.bio && (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Accolades */}
      <section className="mx-auto mt-10 max-w-6xl px-4">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-white">Accolades</h2>
          <span className="text-xs tracking-wide text-slate-500 uppercase">Platform recognition</span>
        </div>
        {badges.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-500">
            Accolades appear here as you trade, verify, and join partner programmes.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <li
                  key={badge.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-sm shadow-black/20",
                    badge.tone,
                  )}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/25 ring-1 ring-white/10">
                    <Icon className={cn("size-5", badge.iconClass)} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold tracking-tight">{badge.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-400">{badge.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Content tabs */}
      <section className="mx-auto mt-12 max-w-6xl px-4 pb-16">
        <Tabs defaultValue="listings">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-slate-800 bg-transparent p-0">
            <TabsTrigger
              value="listings"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-slate-400 shadow-none data-active:border-amber-500 data-active:bg-transparent data-active:text-amber-100"
            >
              Active Listings
              <span className="ml-1.5 text-xs text-slate-500">({activeListings.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="purchases"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-slate-400 shadow-none data-active:border-amber-500 data-active:bg-transparent data-active:text-amber-100"
            >
              Purchase History
              <span className="ml-1.5 text-xs text-slate-500">({purchases.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="wishlist"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-slate-400 shadow-none data-active:border-amber-500 data-active:bg-transparent data-active:text-amber-100"
            >
              Wishlist
              <span className="ml-1.5 text-xs text-slate-500">({wishlist.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-6">
            {activeListings.length === 0 ? (
              <EmptyState
                title="No active listings"
                body="List a coin or banknote to start building your seller portfolio."
                href="/listings/new"
                cta="List an Item"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {activeListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchases" className="mt-6">
            {purchases.length === 0 ? (
              <EmptyState
                title="No purchases yet"
                body="Won auctions and Buy Now checkouts will appear here."
                href="/listings"
                cta="Browse market"
              />
            ) : (
              <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
                {purchases.map((order) => {
                  const thumb = order.listing.images[0];
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/orders/${order.id}`}
                        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-800/60"
                      >
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                          {thumb ? (
                            <Image src={thumb} alt="" fill className="object-cover" sizes="56px" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-600">
                              <ImageOffIcon className="size-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-100">{order.listing.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString("en-ZA", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · {order.status.replaceAll("_", " ")}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-amber-200">
                          {formatZarCents(order.totalCents)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="wishlist" className="mt-6">
            {wishlist.length === 0 ? (
              <EmptyState
                title="Wishlist is empty"
                body="Save lots you are watching from any listing page."
                href="/listings"
                cta="Browse market"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {wishlist.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} wishlisted />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <EditProfileModal open={editOpen} onOpenChange={handleEditOpenChange} initial={editable} />
    </div>
  );
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-14 text-center">
      <p className="font-heading text-lg font-medium text-slate-200">{title}</p>
      <p className="max-w-sm text-sm text-slate-500">{body}</p>
      <Link
        href={href}
        className="mt-2 inline-flex h-8 items-center rounded-lg bg-amber-500 px-3 text-sm font-medium text-slate-950 hover:bg-amber-400"
      >
        {cta}
      </Link>
    </div>
  );
}
