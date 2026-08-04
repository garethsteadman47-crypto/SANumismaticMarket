import Link from "next/link";
import type { Metadata } from "next";
import {
  BarChart3Icon,
  CheckIcon,
  CrownIcon,
  LockOpenIcon,
  PercentIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MEMBERSHIP_PLANS, type MembershipTierPlan } from "@/lib/membership-plans";
import { formatZarCents } from "@/lib/utils/currency";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Membership — ${SITE_NAME}`,
  description: "Upgrade to Silver or Gold for priority indexing, VIP placement, and lower commissions on MintMark.",
};

function planCardClass(plan: MembershipTierPlan): string {
  switch (plan.visual) {
    case "gold":
      return cn(
        "membership-card-gold border-amber-500 bg-gradient-to-br from-slate-900 to-black text-white",
        "shadow-xl shadow-amber-950/20 transition-[box-shadow,transform] duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(245,158,11,0.35)]",
      );
    case "silver":
      return cn(
        "border-slate-300 bg-gradient-to-br from-slate-800 to-slate-900 text-white",
        "shadow-lg shadow-slate-950/30 transition-[box-shadow,transform] duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(226,232,240,0.28)]",
      );
    default:
      return "border-slate-700 bg-slate-900 text-slate-100";
  }
}

export default function MembershipPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12),_transparent_55%)]"
      />

      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium tracking-[0.2em] text-amber-500 uppercase">Membership</p>
        <h1 className="font-heading text-4xl font-semibold text-slate-950 sm:text-5xl dark:text-white">
          Sell faster. Rank higher. Keep more.
        </h1>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
          Transparent commissions that scale with order value — plus indexing and placement upgrades that make Silver
          and Gold feel irresistible.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {MEMBERSHIP_PLANS.map((plan) => {
          const isGold = plan.visual === "gold";
          const isSilver = plan.visual === "silver";
          return (
            <article
              key={plan.id}
              className={cn("relative flex flex-col rounded-2xl border p-6", planCardClass(plan))}
            >
              {isGold && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-amber-300 uppercase">
                  <SparklesIcon className="size-3" />
                  Recommended
                </span>
              )}

              <div className="mb-4 flex items-center gap-2">
                {(isGold || isSilver) && (
                  <CrownIcon className={cn("size-5", isGold ? "text-amber-400" : "text-slate-200")} />
                )}
                <div>
                  <h2 className="font-heading text-2xl font-semibold">{plan.name}</h2>
                  <p className="text-xs text-slate-400">{plan.target}</p>
                </div>
              </div>

              <div className="mb-5">
                {plan.monthlyPriceCents === 0 ? (
                  <p className="font-sans text-3xl font-semibold tracking-tight">Free</p>
                ) : (
                  <>
                    <p className="font-sans text-3xl font-semibold tracking-tight">
                      {formatZarCents(plan.monthlyPriceCents)}
                      <span className="text-sm font-medium text-slate-400">/mo</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">or {formatZarCents(plan.yearlyPriceCents)}/year</p>
                  </>
                )}
              </div>

              <div
                className={cn(
                  "mb-4 rounded-lg border p-3",
                  isGold ? "border-amber-500/25 bg-black/40" : "border-slate-600/60 bg-black/25",
                )}
              >
                <p
                  className={cn(
                    "mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-wide uppercase",
                    isGold ? "text-amber-400" : "text-slate-300",
                  )}
                >
                  <PercentIcon className="size-3" aria-hidden />
                  Seller commission by order value
                </p>
                <dl className="flex flex-col gap-2">
                  {plan.commissionRows.map((row) => (
                    <div key={row.band} className="flex items-baseline justify-between gap-2 text-sm">
                      <dt className="text-slate-400">{row.band}</dt>
                      <dd
                        className={cn(
                          "font-semibold tabular-nums",
                          isGold ? "text-amber-50" : isSilver ? "text-slate-50" : "text-slate-100",
                        )}
                      >
                        {row.rate}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mb-5 flex flex-col gap-2">
                {plan.feeRows.map((row) => (
                  <div key={row.label} className="text-sm">
                    <div className="text-xs font-medium text-slate-400">{row.label}</div>
                    <div className={cn("font-medium", isGold ? "text-amber-50" : "text-slate-100")}>{row.value}</div>
                  </div>
                ))}
              </div>

              <ul className="mb-6 flex flex-1 flex-col gap-2.5">
                {plan.highlightFeature && (
                  <li className="flex items-start gap-2 text-sm font-semibold">
                    <CheckIcon
                      className={cn("mt-0.5 size-4 shrink-0", isGold ? "text-amber-400" : "text-slate-200")}
                    />
                    <span className={isGold ? "text-amber-100" : "text-white"}>{plan.highlightFeature}</span>
                  </li>
                )}
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckIcon
                      className={cn("mt-0.5 size-4 shrink-0", isGold ? "text-amber-400" : "text-slate-500")}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                size="lg"
                className={cn(
                  "w-full",
                  isGold && "bg-amber-500 text-slate-950 hover:bg-amber-400",
                  isSilver && "border-slate-300 bg-slate-100 text-slate-950 hover:bg-white",
                  plan.visual === "standard" && "border-slate-600 bg-slate-800 text-white hover:bg-slate-700",
                )}
                variant={isGold || isSilver ? "default" : "outline"}
                nativeButton={false}
                render={<Link href="/login" />}
              >
                {plan.ctaLabel}
              </Button>
            </article>
          );
        })}
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
          <thead className="border-b border-slate-800 bg-slate-900">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold text-white">Order value band</th>
              {MEMBERSHIP_PLANS.map((p) => (
                <th key={p.id} className="px-4 py-3 font-heading font-semibold text-white">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEMBERSHIP_PLANS[0].commissionRows.map((_, i) => (
              <tr
                key={MEMBERSHIP_PLANS[0].commissionRows[i].band}
                className="border-b border-slate-800/80 last:border-0"
              >
                <td className="px-4 py-2.5 font-medium text-slate-400">
                  {MEMBERSHIP_PLANS[0].commissionRows[i].band}
                </td>
                {MEMBERSHIP_PLANS.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 font-semibold tabular-nums">
                    {p.commissionRows[i].rate}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-slate-800/80">
              <td className="px-4 py-2.5 font-medium text-slate-400">Verification fee</td>
              {MEMBERSHIP_PLANS.map((p) => (
                <td key={p.id} className="px-4 py-2.5">
                  {p.verificationFeeCents === 0 ? "R0 (waived)" : formatZarCents(p.verificationFeeCents)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium tracking-[0.2em] text-amber-500 uppercase">Partnership</p>
            <h2 className="font-heading text-3xl font-semibold text-white text-balance">
              Unlock the Ultimate Numismatic Edge with SA Coin Club
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Link your SA Coin Club membership to MintMark and unlock Hern catalog valuations, mintage analytics, and
              South Africa&apos;s premier collector network — on every listing.
            </p>

            <ul className="mt-2 flex flex-col gap-3">
              <li className="flex items-start gap-3 text-sm text-slate-200">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                  <LockOpenIcon className="size-4" aria-hidden />
                </span>
                <div>
                  <div className="font-semibold text-white">Full Hern&apos;s Catalog Access</div>
                  <p className="text-slate-400">
                    Instantly unlock historical Hern&apos;s catalog valuations on every MintMark listing.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-200">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                  <BarChart3Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <div className="font-semibold text-white">Market Analytics</div>
                  <p className="text-slate-400">View real-time mintage vs. valuation charts.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-200">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                  <UsersIcon className="size-4" aria-hidden />
                </span>
                <div>
                  <div className="font-semibold text-white">Community Access</div>
                  <p className="text-slate-400">Join South Africa&apos;s premier numismatic network.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-black/40 p-6">
            <p className="text-sm text-slate-400">
              Already a member? Link once and Hern valuations unlock across the marketplace.
            </p>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full border-slate-600 bg-transparent text-white hover:bg-slate-900"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Link Existing Account
            </Button>
            <Button
              type="button"
              size="lg"
              className="w-full bg-white text-slate-950 hover:bg-slate-100"
              nativeButton={false}
              render={
                <a href="https://coinclub.co.za" target="_blank" rel="noopener noreferrer" />
              }
            >
              Join SA Coin Club (coinclub.co.za)
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
