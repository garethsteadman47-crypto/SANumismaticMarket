import { db } from "@/lib/db";

/**
 * Persists a buyer's `/listings` filter combination for later. This only
 * covers the "save" half of "notify me when new items match" — there's no
 * background job re-running `queryString` and alerting on new matches yet
 * (that would need a scheduled worker, similar in spirit to the escrow
 * settlement cron). Documented here rather than silently over-promising in
 * the UI copy.
 */

export type SaveSearchResult = { success: true; savedSearchId: string } | { success: false; error: string };

export async function createSavedSearch({
  userId,
  label,
  queryString,
}: {
  userId: string;
  label: string;
  queryString: string;
}): Promise<SaveSearchResult> {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    return { success: false, error: "Give this search a short label." };
  }

  const savedSearch = await db.savedSearch.create({
    data: { userId, label: trimmedLabel, queryString },
  });

  return { success: true, savedSearchId: savedSearch.id };
}

export async function getSavedSearchesForUser(userId: string) {
  return db.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}
