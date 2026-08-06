"use client";

import { useRouter } from "next/navigation";
import {
  HeartIcon,
  InboxIcon,
  LogOutIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TagIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";

import { signOutAction } from "@/actions/auth";
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

const ACCOUNT_LINKS = [
  { href: "/account", label: "My Profile", icon: UserIcon },
  { href: "/account/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/account/orders", label: "Orders", icon: PackageIcon },
  { href: "/account/purchases", label: "Purchases", icon: ShoppingBagIcon },
  { href: "/account/sales", label: "Sales", icon: TagIcon },
  { href: "/account/payouts", label: "Payouts", icon: WalletIcon },
  { href: "/account/wishlist", label: "Wishlist", icon: HeartIcon },
  { href: "/account/settings", label: "Settings & Edit", icon: SettingsIcon },
] as const;

/** Far-right account menu: profile tracking links + sign out. */
export function AccountNavMenu({ displayName }: { displayName?: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOutAction();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full border border-slate-200/80 bg-background hover:bg-muted"
            aria-label="My Account"
          />
        }
      >
        <UserIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {displayName?.trim() || "My Account"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} onClick={() => router.push(href)}>
              <Icon />
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void handleSignOut()}>
            <LogOutIcon />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
