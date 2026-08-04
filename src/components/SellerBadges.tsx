import { AwardIcon, BadgeCheckIcon, ShieldCheckIcon, StoreIcon } from "lucide-react";
import type { SubscriptionTier } from "@prisma/client";

import { TrustBadge } from "@/components/TrustBadge";
import { cn } from "@/lib/utils";

export interface SellerBadgeData {
  subscriptionTier: SubscriptionTier;
  isSaandDealer?: boolean;
  isCoinClubMember?: boolean;
  completedSalesCount?: number;
}

/**
 * Inline verification chips for product detail pages and seller profiles.
 * Icons only — no emojis.
 */
export function SellerBadges({
  seller,
  className,
  compact = false,
}: {
  seller: SellerBadgeData;
  className?: string;
  compact?: boolean;
}) {
  const sales = seller.completedSalesCount ?? 0;
  const salesLabel =
    sales >= 150 ? "150+ Verified Sales" : sales > 0 ? `${sales} Verified Sales` : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <TrustBadge tier={seller.subscriptionTier} className={compact ? "text-[0.65rem]" : undefined} />

      {(seller.isSaandDealer || seller.subscriptionTier === "DEALER") && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-300",
            compact ? "text-[0.65rem]" : "text-xs"
          )}
        >
          <ShieldCheckIcon className={compact ? "size-3" : "size-3.5"} aria-hidden />
          SAAND Verified Dealer
        </span>
      )}

      {seller.isCoinClubMember && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
            compact ? "text-[0.65rem]" : "text-xs"
          )}
        >
          <AwardIcon className={compact ? "size-3" : "size-3.5"} aria-hidden />
          Coin Club Member
        </span>
      )}

      {salesLabel && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-800 dark:text-emerald-300",
            compact ? "text-[0.65rem]" : "text-xs"
          )}
        >
          <BadgeCheckIcon className={compact ? "size-3" : "size-3.5"} aria-hidden />
          {salesLabel}
        </span>
      )}

      {seller.subscriptionTier === "DEALER" && !seller.isSaandDealer && (
        <span className="sr-only">
          <StoreIcon />
        </span>
      )}
    </div>
  );
}
