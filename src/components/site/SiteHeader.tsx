import Link from "next/link";
import { CoinsIcon, MenuIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TrustBadge } from "@/components/TrustBadge";
import { DevUserSwitcher } from "@/components/auth/DevUserSwitcher";
import { auth, signOut } from "@/lib/auth";
import { isDevLoginEnabled } from "@/lib/dev-users";
import { ALL_CATEGORIES, CATEGORY_LABELS, CATEGORY_SLUGS } from "@/lib/categories";

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

function NavLinks({ onNavigate }: { onNavigate?: boolean }) {
  return (
    <>
      {ALL_CATEGORIES.map((category) => (
        <Link
          key={category}
          href={`/category/${CATEGORY_SLUGS[category]}`}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          data-close-sheet={onNavigate ? "true" : undefined}
        >
          {CATEGORY_LABELS[category]}
        </Link>
      ))}
    </>
  );
}

export async function SiteHeader() {
  const session = await auth();

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
              <SheetTitle>SA Numismatic Marketplace</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-3 px-4">
              <NavLinks onNavigate />
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-1.5 font-semibold">
          <CoinsIcon className="size-5 text-amber-600" />
          <span className="hidden sm:inline">SA Numismatic Marketplace</span>
          <span className="sm:hidden">SANM</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-5 md:flex">
          <NavLinks />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isDevLoginEnabled() && <DevUserSwitcher />}

          <Button type="button" variant="secondary" size="sm" nativeButton={false} render={<Link href="/listings/new" />}>
            <PlusIcon />
            <span className="hidden sm:inline">Sell an item</span>
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
            <Button type="button" size="sm" nativeButton={false} render={<Link href="/auth/signin" />}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
