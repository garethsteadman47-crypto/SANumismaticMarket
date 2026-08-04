import { ListingCategory } from "@prisma/client";

/**
 * Single source of truth for category <-> URL slug mapping and display
 * labels, shared by the homepage, `/category/[slug]`, and `ListingForm`.
 */
export const CATEGORY_SLUGS: Record<ListingCategory, string> = {
  COINS: "coins",
  BANKNOTES: "banknotes",
  BULLION: "bullion",
  KRUGERRAND: "krugerrands",
  MEDALLIONS_TOKENS: "medallions-tokens",
  ACCESSORIES: "accessories",
  OTHER: "other",
};

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  COINS: "Coins",
  BANKNOTES: "Banknotes",
  BULLION: "Bullion",
  KRUGERRAND: "Krugerrands",
  MEDALLIONS_TOKENS: "Medallions and Tokens",
  ACCESSORIES: "Accessories",
  OTHER: "Other",
};

export const CATEGORY_DESCRIPTIONS: Record<ListingCategory, string> = {
  COINS: "Rare and collectible South African and world coins.",
  BANKNOTES: "Historic and modern South African banknotes.",
  BULLION: "Investment-grade gold, silver, and platinum bullion.",
  KRUGERRAND: "The world's most traded gold bullion coin.",
  MEDALLIONS_TOKENS: "Commemorative medallions, tokens, and exonumia.",
  ACCESSORIES: "Coin holders, display cases, and collecting tools.",
  OTHER: "Everything else in the numismatic world.",
};

const SLUG_TO_CATEGORY: Record<string, ListingCategory> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([category, slug]) => [slug, category as ListingCategory])
);

export function categoryFromSlug(slug: string): ListingCategory | undefined {
  return SLUG_TO_CATEGORY[slug];
}

export const ALL_CATEGORIES = Object.values(ListingCategory);
