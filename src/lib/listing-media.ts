/**
 * Explicit media-slot architecture for the listing wizard.
 * Slot-keyed state (never array indices) prevents preview/file drift across Cover / Obverse / Reverse / Slab.
 */

export type MediaSlotState = {
  file: File | null;
  previewUrl: string | null;
  remoteUrl: string | null;
};

export type ListingMediaSlotId = "cover" | "obverse" | "reverse" | "slab";

export type ListingMediaState = {
  cover: MediaSlotState;
  obverse: MediaSlotState;
  reverse: MediaSlotState;
  slab: MediaSlotState;
};

export const EMPTY_MEDIA_SLOT: MediaSlotState = {
  file: null,
  previewUrl: null,
  remoteUrl: null,
};

export const EMPTY_LISTING_MEDIA: ListingMediaState = {
  cover: { ...EMPTY_MEDIA_SLOT },
  obverse: { ...EMPTY_MEDIA_SLOT },
  reverse: { ...EMPTY_MEDIA_SLOT },
  slab: { ...EMPTY_MEDIA_SLOT },
};

export const LISTING_MEDIA_SLOT_META: { id: ListingMediaSlotId; label: string }[] = [
  { id: "cover", label: "Cover photo" },
  { id: "obverse", label: "Obverse (front)" },
  { id: "reverse", label: "Reverse (back)" },
  { id: "slab", label: "Certificate / slab serial" },
];

export function createEmptyMediaSlot(): MediaSlotState {
  return { file: null, previewUrl: null, remoteUrl: null };
}

export function createEmptyListingMedia(): ListingMediaState {
  return {
    cover: createEmptyMediaSlot(),
    obverse: createEmptyMediaSlot(),
    reverse: createEmptyMediaSlot(),
    slab: createEmptyMediaSlot(),
  };
}

/** Revoke a blob: object URL if present. */
export function revokeMediaPreview(url: string | null | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/** Display src for a slot — prefers live preview, then remote URL. */
export function mediaSlotDisplayUrl(slot: MediaSlotState): string {
  return slot.previewUrl || slot.remoteUrl || "";
}

/** True when the slot has either a local file or a remote/public URL. */
export function mediaSlotHasContent(slot: MediaSlotState): boolean {
  return Boolean(slot.file || slot.remoteUrl || (slot.previewUrl && !slot.previewUrl.startsWith("blob:")));
}

export function mediaSlotHasAnyContent(slot: MediaSlotState): boolean {
  return Boolean(slot.file || slot.previewUrl || slot.remoteUrl);
}

/**
 * Resolve the durable URL to publish for a slot.
 * Remote HTTPS URLs win; local blob/file previews fall back to a seeded placeholder CDN URL.
 */
export function resolvePublishableSlotUrl(
  slot: MediaSlotState,
  placeholder: (seed: string) => string,
  seed: string,
): string | undefined {
  const remote = slot.remoteUrl?.trim();
  if (remote && /^https?:\/\//i.test(remote)) return remote;

  const preview = slot.previewUrl?.trim();
  if (preview && /^https?:\/\//i.test(preview)) return preview;

  if (slot.file || (preview && preview.startsWith("blob:"))) {
    return placeholder(seed);
  }

  return undefined;
}
