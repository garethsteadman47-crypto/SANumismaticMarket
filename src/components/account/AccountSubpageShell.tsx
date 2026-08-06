import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  HeartIcon,
  InboxIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TagIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";

import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ACCOUNT_SUBNAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/account", label: "Profile", icon: UserIcon },
  { href: "/account/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/account/orders", label: "Orders", icon: PackageIcon },
  { href: "/account/purchases", label: "Purchases", icon: ShoppingBagIcon },
  { href: "/account/sales", label: "Sales", icon: TagIcon },
  { href: "/account/payouts", label: "Payouts", icon: WalletIcon },
  { href: "/account/wishlist", label: "Wishlist", icon: HeartIcon },
  { href: "/account/settings", label: "Settings", icon: SettingsIcon },
];

export function AccountSubpageShell({
  title,
  description,
  icon: Icon,
  children,
  activeHref,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
  activeHref: string;
}) {
  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_55%)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <nav className="flex flex-wrap gap-1.5" aria-label="Account sections">
          {ACCOUNT_SUBNAV.map(({ href, label, icon: NavIcon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                )}
              >
                <NavIcon className="size-3.5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <header className="flex flex-col gap-3 border-b border-slate-800 pb-6">
          <p className="text-xs font-medium tracking-[0.18em] text-amber-500 uppercase">{SITE_NAME}</p>
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
              <Icon className="size-5" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="max-w-2xl text-sm text-slate-400">{description}</p>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

export function AccountPlaceholderPanel({
  title,
  body,
  bullets,
}: {
  title: string;
  body: string;
  bullets: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20 sm:p-8">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
      <ul className="mt-6 space-y-3">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex gap-3 rounded-lg border border-slate-800/80 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"
          >
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
            {bullet}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-slate-500">
        Live tracking data will appear here once courier and order sync is connected.
      </p>
    </section>
  );
}
