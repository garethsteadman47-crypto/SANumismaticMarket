import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckIcon,
  CrownIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Membership — ${SITE_NAME}`,
  description:
    "Compare Guest / Standard and MintMark Gold membership. Zero verification fees, priority placement, and early auction access.",
};

const STANDARD_FEATURES = [
  "Free to join — no monthly subscription",
  "Full marketplace access to Buy Now, Make Offer, and live auctions",
  "Standard escrow fees on settled sales",
  "R15 certification verification deduction applied at checkout",
  "Verified Authentic Shield on graded listings",
] as const;

const GOLD_FEATURES = [
  "R15 certification verification fee waived at every checkout",
  "Prioritized search placement across Buy Coins & auctions",
  "Early access window to live auctions before the public floor",
  "Gold Trust Badge on every listing and seller profile",
  "Instant settlement velocity on eligible sales",
] as const;

export default function MembershipPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.12),_transparent_60%)]"
      />

      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium tracking-[0.2em] text-amber-700 uppercase">Membership</p>
        <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl dark:text-white">
          Collect with distinction
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Two clear tiers. Join free as a Guest / Standard member, or elevate to MintMark Gold for waived
          verification fees and preferential marketplace placement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
        {/* Guest / Standard */}
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <ShieldCheckIcon className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Guest / Standard</h2>
              <p className="text-sm text-muted-foreground">Essential marketplace access</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="font-sans text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Free</p>
            <p className="mt-1 text-sm text-muted-foreground">to join — no card required</p>
          </div>

          <ul className="mb-8 flex flex-1 flex-col gap-3">
            {STANDARD_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            nativeButton={false}
            render={<Link href="/auth/signin" />}
          >
            Create free account
          </Button>
        </article>

        {/* MintMark Gold — premium dark card with animated gradient border */}
        <article className="group relative rounded-2xl p-[1px]">
          <div
            aria-hidden
            className="absolute inset-0 animate-[gold-border-spin_4s_linear_infinite] rounded-2xl bg-[conic-gradient(from_var(--gold-angle),#b45309,#fbbf24,#fef3c7,#b45309)] opacity-70 transition-opacity duration-500 group-hover:opacity-100"
          />
          <div className="relative flex h-full flex-col rounded-[calc(1rem-1px)] border border-amber-500/50 bg-slate-900 p-8 text-slate-100 shadow-xl shadow-amber-950/20">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                  <CrownIcon className="size-5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-amber-50">MintMark Gold</h2>
                  <p className="text-sm text-slate-400">Priority collector membership</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-amber-300 uppercase">
                <SparklesIcon className="size-3" aria-hidden />
                Recommended
              </span>
            </div>

            <div className="mb-6">
              <p className="font-sans text-4xl font-semibold tracking-tight text-amber-50">
                R499
                <span className="text-lg font-medium text-slate-400">/month</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">or R4,990/year — two months complimentary</p>
            </div>

            <ul className="mb-8 flex flex-1 flex-col gap-3">
              {GOLD_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <ZapIcon className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              size="lg"
              className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
              nativeButton={false}
              render={<Link href="/auth/signin" />}
            >
              Upgrade to Gold
            </Button>
          </div>
        </article>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        The R15 certification verification fee is deducted at checkout for Standard accounts and waived for active
        Gold members. Escrow commission schedules are unchanged by tier; Gold primarily improves verification cost,
        discovery, and auction access.
      </p>
    </main>
  );
}
