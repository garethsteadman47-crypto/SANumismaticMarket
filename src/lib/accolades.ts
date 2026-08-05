import type { LucideIcon } from "lucide-react";
import { AwardIcon, CheckCircleIcon, ShieldCheckIcon, StarIcon } from "lucide-react";

/** Stable badge IDs stored on `User.accolades`. */
export type AccoladeId = "SAAND_VERIFIED" | "COIN_CLUB" | "TOP_SELLER_100" | "EARLY_ADOPTER";

export interface AccoladeDefinition {
  id: AccoladeId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon + chip chrome. */
  tone: string;
  iconClass: string;
}

export const ACCOLADE_CATALOG: Record<AccoladeId, AccoladeDefinition> = {
  SAAND_VERIFIED: {
    id: "SAAND_VERIFIED",
    label: "SAAND Dealer",
    description: "Verified South African Association of Numismatic Dealers member",
    icon: ShieldCheckIcon,
    tone: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    iconClass: "text-amber-400",
  },
  COIN_CLUB: {
    id: "COIN_CLUB",
    label: "SA Coin Club Member",
    description: "South African Coin Club partnership member",
    icon: AwardIcon,
    tone: "border-slate-400/40 bg-slate-400/10 text-slate-100",
    iconClass: "text-slate-300",
  },
  TOP_SELLER_100: {
    id: "TOP_SELLER_100",
    label: "100+ Verified Sales",
    description: "Completed more than 100 settled sales on MintMark",
    icon: CheckCircleIcon,
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
    iconClass: "text-emerald-400",
  },
  EARLY_ADOPTER: {
    id: "EARLY_ADOPTER",
    label: "MintMark Founder's Circle",
    description: "Early adopter of the MintMark marketplace",
    icon: StarIcon,
    tone: "border-orange-700/50 bg-orange-900/30 text-orange-100",
    iconClass: "text-orange-400",
  },
};

export function resolveAccolades(ids: string[]): AccoladeDefinition[] {
  const seen = new Set<string>();
  const out: AccoladeDefinition[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const def = ACCOLADE_CATALOG[id as AccoladeId];
    if (def) out.push(def);
  }
  return out;
}

/** Derives a public @handle from name or email local-part. */
export function profileHandle(name: string | null | undefined, email: string): string {
  const fromName = name?.trim().replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
  if (fromName) return `@${fromName}`;
  const local = email.split("@")[0] ?? "collector";
  return `@${local}`;
}
