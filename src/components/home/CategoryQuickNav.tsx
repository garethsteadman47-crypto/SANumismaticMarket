import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BanknoteIcon, CoinsIcon, GemIcon, LandmarkIcon, LayersIcon } from "lucide-react";

import { BROWSE_TAXONOMY_LABELS } from "@/lib/constants";

const CATEGORIES: {
  href: string;
  id: keyof typeof BROWSE_TAXONOMY_LABELS;
  icon: LucideIcon;
}[] = [
  { href: "/listings?category=zar", id: "zar", icon: CoinsIcon },
  { href: "/listings?category=union", id: "union", icon: LandmarkIcon },
  { href: "/listings?category=republic", id: "republic", icon: LandmarkIcon },
  { href: "/listings?category=bullion", id: "bullion", icon: GemIcon },
  { href: "/listings?category=sets", id: "sets", icon: LayersIcon },
  { href: "/listings?category=banknotes", id: "banknotes", icon: BanknoteIcon },
];

/** Quick-nav grid into the browse taxonomy via `?category=` deep links. */
export function CategoryQuickNav() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-semibold text-slate-950 dark:text-white">Browse by category</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Jump into the collections collectors search most.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const meta = BROWSE_TAXONOMY_LABELS[category.id];
          return (
            <Link
              key={category.href}
              href={category.href}
              className="group flex flex-col gap-3 border border-slate-200 bg-white p-4 transition-all hover:border-amber-500/40 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-slate-950 text-amber-400 transition-transform group-hover:scale-105">
                <Icon className="size-4" aria-hidden />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-slate-950 dark:text-white">{meta.label}</h3>
                <p className="mt-1 text-xs text-slate-500">{meta.children.join(", ")}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
