"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AwardIcon, Building2Icon, CoinsIcon, CrownIcon, FlaskConicalIcon, Loader2Icon, UserIcon } from "lucide-react";
import { SubscriptionTier } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { devSignInAction } from "@/actions/auth";

const DEMO_TIER_CONFIG: Array<{ tier: SubscriptionTier; label: string; description: string; icon: typeof UserIcon }> = [
  { tier: "STANDARD", label: "Standard User", description: "7.5%–2% commission tier", icon: UserIcon },
  { tier: "SILVER", label: "Silver Collector", description: "6%–1.5% commission, R7.50 cert fee", icon: CoinsIcon },
  { tier: "GOLD", label: "Gold Power Trader", description: "4.5%–1% commission, instant payout", icon: CrownIcon },
  { tier: "DEALER", label: "Verified Dealer", description: "Lowest commission, SAAND badge", icon: Building2Icon },
];

/**
 * Dev/demo-only identity switcher. Rendered by the caller only when
 * `isDevLoginEnabled()` is true (see `lib/dev-users.ts`) — the
 * `devSignInAction` server action re-checks this too, as defense in depth.
 */
export function DevUserSwitcher({ variant = "dropdown" }: { variant?: "dropdown" | "buttons" }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSelect(tier: SubscriptionTier) {
    startTransition(async () => {
      const result = await devSignInAction(tier);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Signed in as the demo ${tier.toLowerCase()} account.`);
      router.push("/");
      router.refresh();
    });
  }

  if (variant === "buttons") {
    return (
      <div className="flex flex-col gap-2">
        {DEMO_TIER_CONFIG.map(({ tier, label, description, icon: Icon }) => (
          <Button
            key={tier}
            type="button"
            variant="outline"
            className="h-auto justify-start gap-3 py-2"
            disabled={isPending}
            onClick={() => handleSelect(tier)}
          >
            <Icon className="size-4" />
            <span className="flex flex-col items-start">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </span>
            {isPending && <Loader2Icon className="ml-auto animate-spin" />}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="sm" disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : <FlaskConicalIcon />}
            Demo login
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch demo account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DEMO_TIER_CONFIG.map(({ tier, label, icon: Icon }) => (
            <DropdownMenuItem key={tier} onClick={() => handleSelect(tier)}>
              <Icon />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
