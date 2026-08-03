import { AwardIcon, CoinsIcon, UserIcon } from "lucide-react";
import { SubscriptionTier } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIER_CONFIG: Record<SubscriptionTier, { label: string; icon: typeof UserIcon; className: string }> = {
  STANDARD: {
    label: "Standard Seller",
    icon: UserIcon,
    className: "bg-secondary text-secondary-foreground",
  },
  SILVER: {
    label: "Silver Trader",
    icon: CoinsIcon,
    className: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  },
  GOLD: {
    label: "Gold Dealer",
    icon: AwardIcon,
    className: "bg-amber-500 text-white hover:bg-amber-500",
  },
};

/** Seller trust badge shown on listing cards and the product detail page. */
export function TrustBadge({ tier, className }: { tier: SubscriptionTier; className?: string }) {
  const { label, icon: Icon, className: tierClassName } = TIER_CONFIG[tier];
  return (
    <Badge className={cn("gap-1", tierClassName, className)}>
      <Icon />
      {label}
    </Badge>
  );
}
