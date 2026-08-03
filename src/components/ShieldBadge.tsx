import { ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** The "Verified Authentic Shield" badge awarded to successfully certified listings. */
export function ShieldBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn("gap-1 bg-emerald-600 text-white hover:bg-emerald-600", className)}>
      <ShieldCheckIcon />
      Verified Authentic
    </Badge>
  );
}
