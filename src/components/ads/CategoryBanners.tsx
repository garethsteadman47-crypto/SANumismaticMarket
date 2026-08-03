import Image from "next/image";
import Link from "next/link";

import type { ActiveAdPlacement } from "@/lib/ads";

/** Up to `AD_SLOT_CAPS.CATEGORY_BANNER` (2) static banners at the top of a category grid. */
export function CategoryBanners({ slots }: { slots: ActiveAdPlacement[] }) {
  if (slots.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {slots.map((slot) => (
        <Link
          key={slot.id}
          href={slot.targetUrl}
          className="relative block aspect-[16/5] overflow-hidden rounded-lg bg-muted"
        >
          <Image src={slot.imageUrl} alt="" fill className="object-cover" />
        </Link>
      ))}
    </div>
  );
}
