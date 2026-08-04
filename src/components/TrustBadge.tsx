import { CrownIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { SubscriptionTier } from "@prisma/client";

import { cn } from "@/lib/utils";

/**
 * Compact membership indicator — icon only (no bulky "Gold Power Trader" /
 * "Silver Collector" text banners). Standard has no badge.
 */
export function TrustBadge({ tier, className }: { tier: SubscriptionTier; className?: string }) {
  if (tier === SubscriptionTier.STANDARD) {
    return null;
  }

  if (tier === SubscriptionTier.SILVER) {
    return (
      <span title="Silver Member" className={cn("inline-flex items-center", className)}>
        <CrownIcon className="h-4 w-4 text-slate-300" aria-hidden />
        <span className="sr-only">Silver Member</span>
      </span>
    );
  }

  if (tier === SubscriptionTier.GOLD) {
    return (
      <span title="Gold Member" className={cn("inline-flex items-center", className)}>
        <CrownIcon className="h-4 w-4 text-amber-500" aria-hidden />
        <span className="sr-only">Gold Member</span>
      </span>
    );
  }

  // DEALER
  return (
    <span title="Verified Dealer" className={cn("inline-flex items-center gap-0.5", className)}>
      <CrownIcon className="h-4 w-4 text-amber-500" aria-hidden />
      <ShieldCheckIcon className="h-4 w-4 text-amber-500" aria-hidden />
      <span className="sr-only">Verified Dealer</span>
    </span>
  );
}

/** Re-export for badge consumers that want a neutral user glyph. */
export { UserIcon };
