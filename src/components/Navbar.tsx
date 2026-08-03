import Link from "next/link";
import { GavelIcon, MenuIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CoinVaultLogo } from "@/components/CoinVaultLogo";
import { TrustBadge } from "@/components/TrustBadge";
import { DevUserSwitcher } from "@/components/auth/DevUserSwitcher";
import { CartButton } from "@/components/cart/CartButton";
import { auth, signOut } from "@/lib/auth";
import { isDevLoginEnabled } from "@/lib/dev-users";
import { countPendingOffersForSeller } from "@/lib/offers";

const SITE_NAME = "CoinVault SA";

const MAIN_NAV_LINKS = [
  { href: "/listings", label: "Buy Coins", icon: "🪙" },
  { href: "/auctions", label: "Live Auctions", icon: "🔨" },
  { href: "/spot-prices", label: "Spot Prices", icon: "📈" },
  { href: "/about", label: "About Us", icon: "ℹ️" },
] as const;

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

function NavLinks() {
  return (
    <>
      {MAIN_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>{link.icon}</span>
          {link.label}
        </Link>
      ))}
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
                <CoinVaultLogo size={24} />
                {SITE_NAME}
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4">
              <NavLinks />
              {session?.user && (
                <Link
                  href="/dashboard/offers"
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <GavelIcon className="size-4" />
                  My Offers
                  {pendingOfferCount > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                      {pendingOfferCount}
                    </span>
                  )}
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CoinVaultLogo size={28} />
          <span className="hidden sm:inline">{SITE_NAME}</span>
          <span className="sm:hidden">CVSA</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-6 md:flex">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isDevLoginEnabled() && <DevUserSwitcher />}

          <CartButton />

          {session?.user && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              nativeButton={false}
              render={<Link href="/dashboard/offers" />}
            >
              <GavelIcon />
              Offers
              {pendingOfferCount > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                  {pendingOfferCount}
                </span>
              )}
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            className="bg-amber-500 text-white hover:bg-amber-600"
            nativeButton={false}
            render={<Link href="/listings/new" />}
          >
            <PlusIcon />
            <span className="hidden sm:inline">List an Item</span>
          </Button>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <TrustBadge tier={session.user.subscriptionTier} className="hidden sm:inline-flex" />
              <form action={handleSignOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link href="/auth/signin" />}>
              Sign In / Register
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
