import Link from "next/link";
import { XIcon } from "lucide-react";

import type { FilterPill } from "@/lib/browse-filters";

export function ActiveFilterPills({ pills, basePath }: { pills: FilterPill[]; basePath: string }) {
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <Link
          key={pill.id}
          href={pill.hrefQuery ? `${basePath}?${pill.hrefQuery}` : basePath}
          className="flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-800 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {pill.label}
          <XIcon className="size-3.5" />
        </Link>
      ))}
    </div>
  );
}
