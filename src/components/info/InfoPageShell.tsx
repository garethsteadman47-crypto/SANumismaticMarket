import type { ReactNode } from "react";

import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function InfoPageShell({
  eyebrow = SITE_NAME,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-12", className)}>
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-8 dark:border-slate-800">
        <p className="text-xs font-medium tracking-[0.18em] text-amber-700 uppercase dark:text-amber-400">
          {eyebrow}
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
          {title}
        </h1>
        {description && <p className="max-w-2xl text-base text-muted-foreground">{description}</p>}
      </header>
      {children}
    </main>
  );
}
