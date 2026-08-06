import Image from "next/image";
import Link from "next/link";
import { GavelIcon, ImageOffIcon, RadioIcon } from "lucide-react";

import { AuctionCountdown } from "@/components/auctions/AuctionCountdown";
import { Badge } from "@/components/ui/badge";
import { formatZarCents } from "@/lib/utils/currency";

export interface AuctionTickerItem {
  id: string;
  title: string;
  images: string[];
  currentBidCents: number;
  endsAtIso: string;
  bidCount: number;
}

/** Horizontal live-auction strip with countdown clocks and current ZAR bids. */
export function AuctionTicker({ auctions }: { auctions: AuctionTickerItem[] }) {
  if (auctions.length === 0) {
    return (
      <section className="border-y bg-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 text-sm text-slate-400">
          <GavelIcon className="size-4 text-amber-400" aria-hidden />
          No live auctions right now — check back soon or browse upcoming lots.
          <Link href="/listings?format=AUCTION&sort=ending_soon" className="ml-auto text-amber-400 hover:text-amber-300">
            View auctions
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="border-y border-slate-800 bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <Badge className="gap-1 bg-red-600 text-white hover:bg-red-600">
            <RadioIcon className="size-3 animate-pulse" aria-hidden />
            Live
          </Badge>
          <h2 className="font-heading text-sm font-semibold tracking-wide text-amber-100 uppercase">
            Auction ticker
          </h2>
          <Link href="/listings?format=AUCTION&sort=ending_soon" className="ml-auto text-xs font-medium text-amber-400 hover:text-amber-300">
            View all auctions
          </Link>
        </div>

        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:thin]">
          {auctions.map((auction) => {
            const cover = auction.images[0];
            return (
              <Link
                key={auction.id}
                href={`/auctions/${auction.id}`}
                className="group flex min-w-[280px] max-w-[320px] shrink-0 items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 transition-colors hover:border-amber-500/40 hover:bg-slate-900"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-slate-800">
                  {cover ? (
                    <Image src={cover} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <ImageOffIcon className="size-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-slate-100 group-hover:text-amber-50">
                    {auction.title}
                  </p>
                  <p className="font-sans text-sm font-semibold text-amber-400">
                    {formatZarCents(auction.currentBidCents)}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-slate-300">
                    <AuctionCountdown targetIso={auction.endsAtIso} label="Ends" onDark />
                    {auction.bidCount > 0 && (
                      <span className="shrink-0 text-[0.7rem] text-slate-300">{auction.bidCount} bids</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
