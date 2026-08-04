import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CrownIcon, ShieldCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const VAULT_IMAGE =
  "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=1200&q=80";

/** Mid-page two-column advertisement module for the homepage. */
export function HomeAdModules() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 md:grid-cols-2">
      {/* Sponsored Vault Showcase */}
      <Link
        href="/listings?category=sets"
        className="group relative min-h-[220px] overflow-hidden rounded-xl border border-amber-500/20"
      >
        <Image
          src={VAULT_IMAGE}
          alt="Bassani Numismatics vault showcase"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
        <div className="absolute inset-0 flex flex-col justify-end gap-2 p-6">
          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-amber-300 uppercase">
            <ShieldCheckIcon className="size-3" aria-hidden />
            Sponsored
          </span>
          <h3 className="font-heading text-2xl font-semibold text-white">
            Bassani Numismatics | SAAND Certified Partner
          </h3>
          <p className="text-sm text-slate-300">Discover rare vintage proof sets and bullion.</p>
          <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-amber-400">
            Browse catalogue
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </span>
        </div>
      </Link>

      {/* MintMark Gold promo */}
      <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-slate-950 via-amber-950/80 to-slate-900 p-6 text-slate-50">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-amber-500/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold tracking-[0.18em] text-amber-400 uppercase">
            <CrownIcon className="size-3.5" aria-hidden />
            MintMark Gold
          </span>
          <h3 className="font-heading text-2xl font-semibold text-amber-50">
            Waive your R15 verification fee on every checkout &amp; list unlimited items.
          </h3>
          <p className="text-sm text-slate-300">
            Priority search indexing, early auction access, and instant settlement for power traders.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="relative mt-6 w-fit bg-amber-500 text-slate-950 hover:bg-amber-400"
          nativeButton={false}
          render={<Link href="/membership" />}
        >
          Upgrade to Gold
        </Button>
      </div>
    </section>
  );
}
