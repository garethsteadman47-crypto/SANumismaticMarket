import Link from "next/link";
import {
  CoinsIcon,
  GavelIcon,
  HeartIcon,
  MenuIcon,
  PackageIcon,
  PlusIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TagIcon,
  TrendingUpIcon,
  CrownIcon,
  UserIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MintMarkLogo } from "@/components/MintMarkLogo";
import { TrustBadge } from "@/components/TrustBadge";
import { DevUserSwitcher } from "@/components/auth/DevUserSwitcher";
import { AccountNavMenu } from "@/components/AccountNavMenu";
import { MoreInfoNavMenu } from "@/components/MoreInfoNavMenu";
import { CartButton } from "@/components/cart/CartButton";
import { auth } from "@/lib/auth";
import { isDevLoginEnabled } from "@/lib/dev-users";
import { MORE_INFO_LINKS } from "@/lib/info-nav";
import { countPendingOffersForSeller } from "@/lib/offers";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAIN_NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/listings", label: "Buy Coins", icon: CoinsIcon },
  { href: "/auctions", label: "Live Auctions", icon: GavelIcon },
  { href: "/spot-prices", label: "Spot Prices", icon: TrendingUpIcon },
  { href: "/membership", label: "Membership", icon: CrownIcon },
];

const ACCOUNT_MOBILE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/account", label: "My Profile", icon: UserIcon },
  { href: "/account/orders", label: "Orders", icon: PackageIcon },
  { href: "/account/purchases", label: "Purchases", icon: ShoppingBagIcon },
  { href: "/account/sales", label: "Sales", icon: TagIcon },
  { href: "/account/wishlist", label: "Wishlist", icon: HeartIcon },
  { href: "/account/settings", label: "Settings & Edit", icon: SettingsIcon },
];

function NavLinks() {
  return (
    <>
      {MAIN_NAV_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {link.label}
          </Link>
        );
      })}
      <div className="hidden md:block">
        <MoreInfoNavMenu />
      </div>
    </>
  );
}

export async function Navbar() {
  const session = await auth();
  const pendingOfferCount = session?.user ? await countPendingOffersForSeller(session.user.id) : 0;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Sheet>
          <SheetTrigger
            render={
              <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <MintMarkLogo size={24} />
                <span className="font-heading text-lg font-semibold text-slate-900 dark:text-white">{SITE_NAME}</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4">
              {MAIN_NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    {link.label}
                  </Link>
                );
              })}
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">More Info</p>
                <div className="flex flex-col gap-3">
                  {MORE_INFO_LINKS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Icon className="size-3.5 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              {session?.user && (
                <div className="border-t pt-3">
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">My Account</p>
                  <div className="flex flex-col gap-3">
                    {ACCOUNT_MOBILE_LINKS.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Icon className="size-3.5 shrink-0" aria-hidden />
                        {label}
                      </Link>
                    ))}
                    <Link
                      href="/dashboard/offers"
                      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <GavelIcon className="size-3.5 shrink-0" aria-hidden />
                      My Offers
                      {pendingOfferCount > 0 && (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                          {pendingOfferCount}
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2">
          <MintMarkLogo size={28} />
          <span className="hidden font-heading text-lg font-semibold text-slate-900 sm:inline dark:text-white">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-5 md:flex lg:gap-6">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isDevLoginEnabled() && <DevUserSwitcher />}

          <CartButton />

          {session?.user && (
            <Link
              href="/dashboard/offers"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden lg:inline-flex")}
            >
              <GavelIcon />
              Offers
              {pendingOfferCount > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                  {pendingOfferCount}
                </span>
              )}
            </Link>
          )}

          <Link
            href="/listings/new"
            className={cn(buttonVariants({ size: "sm" }), "bg-amber-500 text-white hover:bg-amber-600")}
          >
            <PlusIcon />
            <span className="hidden sm:inline">List an Item</span>
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <TrustBadge tier={session.user.subscriptionTier} className="hidden sm:inline-flex" />
              <AccountNavMenu displayName={session.user.name} />
            </div>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Sign In / Register
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
