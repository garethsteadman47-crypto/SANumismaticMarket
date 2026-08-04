import { AwardIcon, Building2Icon, CoinsIcon, CrownIcon, UserIcon } from "lucide-react";
import { SubscriptionTier } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<
  SubscriptionTier,
  { label: string; icon: typeof UserIcon; className: string }
> = {
  STANDARD: {
    label: "Standard",
    icon: UserIcon,
    className: "bg-secondary text-secondary-foreground",
  },
  SILVER: {
    label: "Silver Collector",
    icon: CoinsIcon,
    className: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  },
  GOLD: {
    label: "Gold Power Trader",
    icon: CrownIcon,
    className: "bg-amber-500 text-white hover:bg-amber-500",
  },
  DEALER: {
    label: "Verified Dealer",
    icon: Building2Icon,
    className: "bg-slate-900 text-amber-300 hover:bg-slate-900",
  },
};

/** Seller trust badge shown on listing cards and the product detail page. */
export function TrustBadge({ tier, className }: { tier: SubscriptionTier; className?: string }) {
  const { label, icon: Icon, className: tierClassName } = TIER_CONFIG[tier] ?? TIER_CONFIG.STANDARD;
  return (
    <Badge className={cn("gap-1", tierClassName, className)}>
      <Icon />
      {label}
    </Badge>
  );
}

/** Re-export Award for badge consumers that want the classic award glyph. */
export { AwardIcon };
