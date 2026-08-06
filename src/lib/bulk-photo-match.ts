import type { BulkDraftRow, BulkPhotoPoolItem, MediaSlotId } from "@/lib/bulk-listings";

const SLOT_KEYWORDS: Record<MediaSlotId, string[]> = {
  cover: ["cover", "main", "hero", "primary"],
  obverse: ["obverse", "obv", "front", "ob"],
  reverse: ["reverse", "rev", "back", "rx"],
  slab: ["slab", "cert", "certificate", "holder", "label"],
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function filenameTokens(name: string): string {
  return normalizeToken(name.replace(/\.[^.]+$/, ""));
}

function inferSlotFromName(name: string): MediaSlotId | null {
  const tokens = filenameTokens(name);
  for (const [slot, keywords] of Object.entries(SLOT_KEYWORDS) as [MediaSlotId, string[]][]) {
    if (keywords.some((keyword) => tokens.includes(keyword))) return slot;
  }
  return null;
}

function scorePhotoForRow(photo: BulkPhotoPoolItem, row: BulkDraftRow): number {
  const tokens = filenameTokens(photo.name);
  let score = 0;

  const cert = normalizeToken(row.certificateId);
  if (cert && cert.length >= 4 && tokens.includes(cert)) score += 60;

  const titleWords = row.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
  for (const word of titleWords) {
    if (tokens.includes(normalizeToken(word))) score += 12;
  }

  return score;
}

export type AutoMatchResult = {
  rows: BulkDraftRow[];
  remainingPool: BulkPhotoPoolItem[];
  assignedCount: number;
};

/**
 * Assign pool photos to row media slots using filename heuristics:
 * row index, cert number, title keywords, and slot keywords (front/rev/slab).
 */
export function autoMatchPhotosToRows(
  rows: BulkDraftRow[],
  pool: BulkPhotoPoolItem[],
): AutoMatchResult {
  const remaining = [...pool];
  let assignedCount = 0;
  const nextRows = rows.map((row) => ({
    ...row,
    media: { ...row.media },
  }));

  for (let draftIndex = 0; draftIndex < nextRows.length; draftIndex++) {
    const row = nextRows[draftIndex];
    const oneBasedIndex = draftIndex + 1;

    const candidates = remaining
      .map((photo, index) => ({
        photo,
        index,
        score: Math.max(
          scorePhotoForRow(photo, row),
          scorePhotoForDraftIndex(photo, oneBasedIndex),
        ),
      }))
      .filter((entry) => entry.score >= 12)
      .sort((a, b) => b.score - a.score);

    for (const candidate of candidates) {
      const stillAvailable = remaining.find((item) => item.id === candidate.photo.id);
      if (!stillAvailable) continue;

      const preferredSlot = inferSlotFromName(candidate.photo.name);
      const slotOrder: MediaSlotId[] = preferredSlot
        ? [preferredSlot, "obverse", "reverse", "cover", "slab"]
        : ["obverse", "reverse", "cover", "slab"];

      const targetSlot = slotOrder.find((slot) => !row.media[slot]);
      if (!targetSlot) continue;

      row.media[targetSlot] = stillAvailable;
      const removeAt = remaining.findIndex((item) => item.id === stillAvailable.id);
      if (removeAt >= 0) remaining.splice(removeAt, 1);
      assignedCount += 1;
    }
  }

  return { rows: nextRows, remainingPool: remaining, assignedCount };
}

function scorePhotoForDraftIndex(photo: BulkPhotoPoolItem, oneBasedIndex: number): number {
  const tokens = filenameTokens(photo.name);
  const index = String(oneBasedIndex);
  let score = 0;
  if (
    tokens.includes(`row${index}`) ||
    tokens.includes(`r${index}`) ||
    tokens.startsWith(`${index}_`) ||
    tokens.includes(`_${index}_`)
  ) {
    score += 50;
  }
  return score;
}
