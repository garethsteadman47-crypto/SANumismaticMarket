"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActiveAdPlacement } from "@/lib/ads";
import { cn } from "@/lib/utils";

const ROTATE_INTERVAL_MS = 6000;

/**
 * Homepage Hero Banner — up to `AD_SLOT_CAPS.HOMEPAGE_HERO` (3) revolving
 * ad slots, auto-rotating with manual prev/next controls. Renders a
 * generic marketing fallback when no ad placements are currently active,
 * so the homepage never looks broken on a fresh deployment.
 */
export function HeroCarousel({ slots }: { slots: ActiveAdPlacement[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slots.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slots.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slots.length]);

  if (slots.length === 0) {
    return (
      <div className="relative flex aspect-[16/6] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 via-background to-slate-100 dark:from-amber-950/40 dark:to-slate-900">
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <h1 className="text-2xl font-semibold sm:text-3xl">South Africa&apos;s trusted numismatic marketplace</h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Buy and sell certified coins, banknotes, and bullion with escrow protection and independent verification
            on every graded listing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative aspect-[16/6] w-full overflow-hidden rounded-xl bg-muted">
      {slots.map((slot, index) => (
        <Link
          key={slot.id}
          href={slot.targetUrl}
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            index === activeIndex ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          <Image src={slot.imageUrl} alt="" fill priority={index === 0} className="object-cover" />
        </Link>
      ))}

      {slots.length > 1 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-1/2 left-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setActiveIndex((current) => (current - 1 + slots.length) % slots.length)}
            aria-label="Previous ad"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setActiveIndex((current) => (current + 1) % slots.length)}
            aria-label="Next ad"
          >
            <ChevronRightIcon />
          </Button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slots.map((slot, index) => (
              <button
                key={slot.id}
                type="button"
                aria-label={`Show ad ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  index === activeIndex ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
