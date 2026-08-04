import { z } from "zod";

import { db } from "@/lib/db";

const currentYear = new Date().getFullYear();

export const createWantedItemSchema = z.object({
  eraCategory: z.string().trim().min(2).max(80),
  targetYear: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1600).max(currentYear).optional()
  ),
  minimumGrade: z.string().trim().max(40).optional().or(z.literal("")),
  budgetCents: z.coerce.number().int().positive("Budget must be greater than R0."),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateWantedItemInput = z.input<typeof createWantedItemSchema>;

export type WantedItemResult =
  | { success: true; wantedItemId: string }
  | { success: false; error: string };

export async function createWantedItem(userId: string, input: CreateWantedItemInput): Promise<WantedItemResult> {
  const parsed = createWantedItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid wanted request." };
  }

  const item = await db.wantedItem.create({
    data: {
      userId,
      eraCategory: parsed.data.eraCategory,
      targetYear: parsed.data.targetYear,
      minimumGrade: parsed.data.minimumGrade || null,
      budgetCents: parsed.data.budgetCents,
      notes: parsed.data.notes || null,
      status: "OPEN",
    },
  });

  // Notification stub — a worker would email/SMS when a match appears.
  console.info("[wanted-item] created", {
    wantedItemId: item.id,
    userId,
    eraCategory: item.eraCategory,
    targetYear: item.targetYear,
    budgetCents: item.budgetCents,
  });

  return { success: true, wantedItemId: item.id };
}

export async function listWantedItems(userId: string) {
  return db.wantedItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Best-effort matcher: when a listing is created, scan OPEN wanted requests
 * for year/budget/category keyword overlap and mark them MATCHED.
 */
export async function matchWantedItemsForListing(listing: {
  id: string;
  title: string;
  year: number | null;
  priceCents: number;
  condition: string | null;
}): Promise<number> {
  const open = await db.wantedItem.findMany({ where: { status: "OPEN" }, take: 200 });
  let matched = 0;
  for (const wanted of open) {
    if (listing.priceCents > wanted.budgetCents) continue;
    if (wanted.targetYear != null && listing.year != null && listing.year !== wanted.targetYear) continue;
    const haystack = `${listing.title} ${listing.condition ?? ""}`.toLowerCase();
    const needle = wanted.eraCategory.toLowerCase();
    if (!haystack.includes(needle.split(" ")[0] ?? needle) && !needle.includes("any")) {
      // Soft match: skip if no keyword overlap unless era is generic.
      const tokens = needle.split(/\s+/).filter((t) => t.length > 2);
      if (tokens.length > 0 && !tokens.some((t) => haystack.includes(t))) continue;
    }
    await db.wantedItem.update({
      where: { id: wanted.id },
      data: {
        status: "MATCHED",
        matchedListingId: listing.id,
        notifiedAt: new Date(),
      },
    });
    console.info("[wanted-item] matched", { wantedItemId: wanted.id, listingId: listing.id });
    matched += 1;
  }
  return matched;
}
