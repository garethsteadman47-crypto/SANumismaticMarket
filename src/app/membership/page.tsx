import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon, CrownIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MEMBERSHIP_PLANS } from "@/lib/membership-plans";
import { formatZarCents } from "@/lib/utils/currency";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Membership — ${SITE_NAME}`,
  description: "Compare Standard, Silver, Gold, and Verified Dealer membership tiers on MintMark.",
};

export default function MembershipPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.12),_transparent_60%)]"
      />

      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium tracking-[0.2em] text-amber-700 uppercase">Membership</p>
        <h1 className="font-heading text-4xl font-semibold text-slate-900 sm:text-5xl dark:text-white">
          Choose your collecting tier
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Four strategic plans — from free Standard access to SAAND Verified Dealer partnership.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {MEMBERSHIP_PLANS.map((plan) => {
          const isGold = plan.highlighted;
          const isDealer = plan.id === "DEALER";
          return (
            <article
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6",
                isGold && "border-amber-500/50 bg-slate-900 text-slate-100 shadow-xl shadow-amber-950/20",
                isDealer && !isGold && "border-slate-800 bg-slate-950 text-slate-100",
                !isGold && !isDealer && "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              )}
            >
              {isGold && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-amber-300 uppercase">
                  <SparklesIcon className="size-3" />
                  Recommended
                </span>
              )}

              <div className="mb-4 flex items-center gap-2">
                {isGold && <CrownIcon className="size-5 text-amber-400" />}
                <div>
                  <h2
                    className={cn(
                      "font-heading text-xl font-semibold",
                      (isGold || isDealer) && "text-amber-50"
                    )}
                  >
                    {plan.name}
                  </h2>
                  <p className={cn("text-xs", isGold || isDealer ? "text-slate-400" : "text-muted-foreground")}>
                    {plan.target}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                {plan.monthlyPriceCents === 0 ? (
                  <p className="font-sans text-3xl font-semibold">Free</p>
                ) : (
                  <>
                    <p className="font-sans text-3xl font-semibold">
                      {formatZarCents(plan.monthlyPriceCents)}
                      <span className={cn("text-sm font-medium", isGold || isDealer ? "text-slate-400" : "text-muted-foreground")}>
                        /mo
                      </span>
                    </p>
                    <p className={cn("mt-1 text-xs", isGold || isDealer ? "text-slate-400" : "text-muted-foreground")}>
                      or {formatZarCents(plan.yearlyPriceCents)}/year
                    </p>
                  </>
                )}
                <p className={cn("mt-2 text-xs", isGold || isDealer ? "text-slate-400" : "text-muted-foreground")}>
                  Verification fee:{" "}
                  {plan.verificationFeeCents === 0
                    ? "Waived"
                    : formatZarCents(plan.verificationFeeCents)}
                </p>
              </div>

              <ul className="mb-6 flex flex-1 flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn(
                      "flex items-start gap-2 text-sm",
                      isGold || isDealer ? "text-slate-200" : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <CheckIcon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        isGold || isDealer ? "text-amber-400" : "text-slate-500"
                      )}
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
                  isGold || isDealer
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : undefined
                )}
                variant={isGold || isDealer ? "default" : "outline"}
                nativeButton={false}
                render={<Link href="/login" />}
              >
                {plan.ctaLabel}
              </Button>
            </article>
          );
        })}
      </div>

      {/* Comparison matrix */}
      <section className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Feature</th>
              {MEMBERSHIP_PLANS.map((p) => (
                <th key={p.id} className="px-4 py-3 font-heading font-semibold">
                  {p.name.split(" ")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Monthly price", ...MEMBERSHIP_PLANS.map((p) => (p.monthlyPriceCents === 0 ? "Free" : formatZarCents(p.monthlyPriceCents)))],
              ["Verification fee", ...MEMBERSHIP_PLANS.map((p) => (p.verificationFeeCents === 0 ? "Waived" : formatZarCents(p.verificationFeeCents)))],
              ["Wishlist alerts", "—", "Yes", "Yes", "Yes"],
              ["Auction listing cap", "Standard", "5 / month", "Unlimited", "Unlimited"],
              ["Early auction access", "—", "—", "Yes", "Yes"],
              ["SAAND dealer badge", "—", "—", "—", "Yes"],
              ["Bulk CSV upload", "—", "—", "—", "Yes"],
              ["Commission", "Standard", "Reduced", "Lower", "Lowest"],
            ].map((row) => (
              <tr key={row[0]} className="border-b last:border-0">
                {row.map((cell, i) => (
                  <td key={`${row[0]}-${i}`} className={cn("px-4 py-2.5", i === 0 && "font-medium text-muted-foreground")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
