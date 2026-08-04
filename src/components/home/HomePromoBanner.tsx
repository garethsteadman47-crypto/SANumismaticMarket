import Link from "next/link";
import { ArrowRightIcon, GavelIcon } from "lucide-react";

/** Slim charcoal promo strip directly under the site nav. */
export function HomePromoBanner() {
  return (
    <div className="border-b border-amber-500/20 bg-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <p className="flex items-center gap-2 text-sm text-slate-100">
          <GavelIcon className="size-4 shrink-0 text-amber-400" aria-hidden />
          <span>
            <span className="font-semibold tracking-wide text-amber-400 uppercase">Featured dealer auction:</span>{" "}
            Rare 1898 Veldpond and Union Proof Sets now live.
          </span>
        </p>
        <Link
          href="/auctions"
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
        >
          View Featured Catalogue
          <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
