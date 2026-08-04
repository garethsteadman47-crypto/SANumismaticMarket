import type { LucideIcon } from "lucide-react";
import {
  AlertTriangleIcon,
  AwardIcon,
  BanknoteIcon,
  CatIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  GemIcon,
  LandmarkIcon,
  LayersIcon,
  PackageIcon,
  ScrollTextIcon,
  ShieldAlertIcon,
} from "lucide-react";

import type { TaxonomyIconName } from "@/lib/numismatic-taxonomy";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<TaxonomyIconName, LucideIcon> = {
  Landmark: LandmarkIcon,
  Coins: CoinsIcon,
  CircleDollarSign: CircleDollarSignIcon,
  Banknote: BanknoteIcon,
  Layers: LayersIcon,
  ShieldAlert: ShieldAlertIcon,
  Deer: GemIcon,
  Gem: GemIcon,
  Package: PackageIcon,
  Award: AwardIcon,
  Globe: LandmarkIcon,
  ScrollText: ScrollTextIcon,
  Buffalo: LayersIcon,
  Cat: CatIcon,
  AlertTriangle: AlertTriangleIcon,
};

export function TaxonomyIcon({
  name,
  className,
}: {
  name: TaxonomyIconName;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? CoinsIcon;
  return <Icon className={cn("size-3.5 shrink-0 text-muted-foreground", className)} aria-hidden />;
}
