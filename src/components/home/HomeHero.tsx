"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { GavelIcon, PlusIcon, ShieldCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroSearchBar } from "@/components/home/HeroSearchBar";
import { BUYER_PROTECTION_LABEL, SITE_NAME } from "@/lib/constants";

const HeroCoinBackground = dynamic(
  () =>
    import("@/components/HeroCoinBackground").then((mod) => mod.HeroCoinBackground),
  {
    ssr: false,
    loading: () => <div aria-hidden className="absolute inset-0 z-0 bg-slate-950" />,
  },
);

/**
 * Full-bleed dark hero — brand-first composition for the MintMark landing page
 * with a premium rotating 3D Krugerrand-inspired coin in the background.
 */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-slate-50">
      <HeroCoinBackground />

      {/* Dark gradient overlay keeps copy legible against the bright gold metal. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-16 sm:py-20 lg:py-24">
        <div className="h-px w-24 bg-gradient-to-r from-amber-500 via-amber-300 to-transparent" />

        <div className="flex max-w-3xl flex-col gap-5">
          <p className="text-xs font-medium tracking-[0.22em] text-amber-400/90 uppercase">{SITE_NAME}</p>
          <h1 className="font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            The Premier African Numismatic Marketplace
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Buy, sell, and bid on verified ZAR, Union, and world numismatic collectables with 100% Buyer Protection.
          </p>
        </div>

        <HeroSearchBar />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            className="bg-amber-500 px-5 text-slate-950 hover:bg-amber-400"
            nativeButton={false}
            render={<Link href="/listings?format=AUCTION&sort=ending_soon" />}
          >
            <GavelIcon />
            Browse Auctions
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="border-slate-500 bg-transparent px-5 text-slate-100 hover:bg-slate-900 hover:text-white"
            nativeButton={false}
            render={<Link href="/listings/new" />}
          >
            <PlusIcon />
            List an Item
          </Button>
        </div>

        <p className="flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheckIcon className="size-4 text-amber-400" aria-hidden />
          Every purchase is covered by {BUYER_PROTECTION_LABEL}.
        </p>
      </div>
    </section>
  );
}
