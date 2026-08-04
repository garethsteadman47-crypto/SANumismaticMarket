import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon, CrownIcon, PercentIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MEMBERSHIP_PLANS } from "@/lib/membership-plans";
import { formatZarCents } from "@/lib/utils/currency";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Membership — ${SITE_NAME}`,
  description: "Tiered seller commission and verification fees for Standard, Silver, and Gold on MintMark.",
};

export default function MembershipPage() {
  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(217,119,6,0.08),_transparent_60%)]"
      />

      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium tracking-[0.2em] text-amber-600 uppercase">Membership</p>
        <h1 className="font-heading text-4xl font-semibold text-slate-950 sm:text-5xl dark:text-white">
          Transparent tiered commissions
        </h1>
        <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
          Rates scale with order value. Verification fees and escrow timing are published per tier — no surprises at
          settlement.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {MEMBERSHIP_PLANS.map((plan) => {
          const isGold = plan.highlighted;
          return (
            <article
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6",
                isGold
                  ? "border-amber-500/50 bg-slate-950 text-white shadow-xl shadow-amber-950/10"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
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
                  <h2 className={cn("font-heading text-2xl font-semibold", isGold && "text-amber-50")}>
                    {plan.name}
                  </h2>
                  <p className={cn("text-xs", isGold ? "text-slate-400" : "text-slate-500")}>{plan.target}</p>
                </div>
              </div>

              <div className="mb-5">
                {plan.monthlyPriceCents === 0 ? (
                  <p className="font-sans text-3xl font-semibold tracking-tight">Free</p>
                ) : (
                  <>
                    <p className="font-sans text-3xl font-semibold tracking-tight">
                      {formatZarCents(plan.monthlyPriceCents)}
                      <span className={cn("text-sm font-medium", isGold ? "text-slate-400" : "text-slate-500")}>
                        /mo
                      </span>
                    </p>
                    <p className={cn("mt-1 text-xs", isGold ? "text-slate-400" : "text-slate-500")}>
                      or {formatZarCents(plan.yearlyPriceCents)}/year
                    </p>
                  </>
                )}
              </div>

              <div
                className={cn(
                  "mb-4 rounded-lg border p-3",
                  isGold ? "border-amber-500/20 bg-black/30" : "border-slate-200 bg-slate-50 dark:border-slate-800"
                )}
              >
                <p
                  className={cn(
                    "mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-wide uppercase",
                    isGold ? "text-amber-400" : "text-amber-700"
                  )}
                >
                  <PercentIcon className="size-3" aria-hidden />
                  Seller commission by order value
                </p>
                <dl className="flex flex-col gap-2">
                  {plan.commissionRows.map((row) => (
                    <div key={row.band} className="flex items-baseline justify-between gap-2 text-sm">
                      <dt className={cn(isGold ? "text-slate-400" : "text-slate-500")}>{row.band}</dt>
                      <dd className={cn("font-semibold tabular-nums", isGold ? "text-amber-50" : "text-slate-950")}>
                        {row.rate}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mb-5 flex flex-col gap-2">
                {plan.feeRows.map((row) => (
                  <div key={row.label} className="text-sm">
                    <div className={cn("text-xs font-medium", isGold ? "text-slate-400" : "text-slate-500")}>
                      {row.label}
                    </div>
                    <div className={cn("font-medium", isGold ? "text-amber-50" : "text-slate-950")}>{row.value}</div>
                  </div>
                ))}
              </div>

              <ul className="mb-6 flex flex-1 flex-col gap-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn("flex items-start gap-2 text-sm", isGold ? "text-slate-200" : "text-slate-700")}
                  >
                    <CheckIcon className={cn("mt-0.5 size-4 shrink-0", isGold ? "text-amber-400" : "text-slate-500")} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                size="lg"
                className={cn("w-full", isGold && "bg-amber-500 text-slate-950 hover:bg-amber-400")}
                variant={isGold ? "default" : "outline"}
                nativeButton={false}
                render={<Link href="/login" />}
              >
                {plan.ctaLabel}
              </Button>
            </article>
          );
        })}
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Order value band</th>
              {MEMBERSHIP_PLANS.map((p) => (
                <th key={p.id} className="px-4 py-3 font-heading font-semibold">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEMBERSHIP_PLANS[0].commissionRows.map((_, i) => (
              <tr key={MEMBERSHIP_PLANS[0].commissionRows[i].band} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-4 py-2.5 font-medium text-slate-500">
                  {MEMBERSHIP_PLANS[0].commissionRows[i].band}
                </td>
                {MEMBERSHIP_PLANS.map((p) => (
                  <td key={p.id} className="px-4 py-2.5 font-semibold tabular-nums">
                    {p.commissionRows[i].rate}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2.5 font-medium text-slate-500">Verification fee</td>
              {MEMBERSHIP_PLANS.map((p) => (
                <td key={p.id} className="px-4 py-2.5">
                  {p.verificationFeeCents === 0 ? "R0 (waived)" : formatZarCents(p.verificationFeeCents)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
