import { Crown, ShieldCheck } from "lucide-react";
import type { SubscriptionTier } from "@prisma/client";

import { cn } from "@/lib/utils";

export interface SellerBadgeData {
  subscriptionTier: SubscriptionTier;
  isSaandDealer?: boolean;
  isCoinClubMember?: boolean;
  completedSalesCount?: number;
}

/**
 * Minimalist seller accolades — icon-only membership crowns and SAAND shield.
 * No bulky "Gold Power Trader" / "Silver" text chips.
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
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const showGold = seller.subscriptionTier === "GOLD";
  const showSilver = seller.subscriptionTier === "SILVER";
  const showSaand = seller.isSaandDealer || seller.subscriptionTier === "DEALER";

  if (!showGold && !showSilver && !showSaand) {
    return null;
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)} aria-label="Seller badges">
      {showGold && (
        <span title="Gold Member" className="inline-flex">
          <Crown className={cn(iconSize, "text-amber-500")} aria-hidden />
          <span className="sr-only">Gold Member</span>
        </span>
      )}
      {showSilver && (
        <span title="Silver Member" className="inline-flex">
          <Crown className={cn(iconSize, "text-slate-300")} aria-hidden />
          <span className="sr-only">Silver Member</span>
        </span>
      )}
      {showSaand && (
        <span title="SAAND Dealer" className="inline-flex">
          <ShieldCheck className={cn(iconSize, "text-amber-500")} aria-hidden />
          <span className="sr-only">SAAND Dealer</span>
        </span>
      )}
    </div>
  );
}
