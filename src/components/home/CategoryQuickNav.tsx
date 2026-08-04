import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BanknoteIcon, CoinsIcon, GemIcon, LayersIcon } from "lucide-react";

const CATEGORIES: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/listings?category=zar-union",
    label: "ZAR & Union",
    description: "Ponde, shillings, pennies & farthings",
    icon: CoinsIcon,
  },
  {
    href: "/listings?category=bullion",
    label: "Republic & Bullion",
    description: "Krugerrands, fractional & uncirculated",
    icon: GemIcon,
  },
  {
    href: "/listings?category=banknotes",
    label: "World Banknotes",
    description: "Specimen notes & vintage European",
    icon: BanknoteIcon,
  },
  {
    href: "/listings?category=sets",
    label: "Sets & Wildlife",
    description: "Big Five, Leopard, proofs & errors",
    icon: LayersIcon,
  },
];

/** Quick-nav grid into the browse taxonomy via `?category=` deep links. */
export function CategoryQuickNav() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-semibold">Browse by category</h2>
        <p className="text-sm text-muted-foreground">Jump straight into the collections collectors search most.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.href}
              href={category.href}
              className="group flex flex-col gap-3 border border-border/80 bg-gradient-to-br from-slate-50 to-white p-5 transition-all hover:border-amber-500/40 hover:shadow-sm dark:from-slate-950 dark:to-slate-900"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-amber-400 transition-transform group-hover:scale-105 dark:bg-amber-500/15">
                <Icon className="size-5" aria-hidden />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold">{category.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
