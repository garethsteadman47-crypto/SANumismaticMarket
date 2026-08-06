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

/** Max edge length when compressing device photos for MongoDB persistence. */
const MAX_IMAGE_EDGE_PX = 1600;
/** JPEG quality for compressed device photos. */
const JPEG_QUALITY = 0.82;
/** Reject device photos larger than this before processing (raw file size). */
export const MAX_UPLOAD_FILE_BYTES = 12 * 1024 * 1024;

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

export function isHttpImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function isDataImageUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(value.trim());
}

/** Persistable listing image: remote HTTPS or an inlined data:image base64 URL. */
export function isPersistableImageSrc(value: string): boolean {
  const trimmed = value.trim();
  return isHttpImageUrl(trimmed) || isDataImageUrl(trimmed);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) {
        resolve(result);
        return;
      }
      reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image for compression."));
    image.src = src;
  });
}

/**
 * Convert a device File into a durable `data:image/...;base64,...` string.
 * Compresses large photos so MongoDB + Server Action payloads stay within limits.
 * Object URLs (`blob:`) are never returned — they only exist in the local tab.
 */
export async function fileToPersistableDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error("Each photo must be under 12 MB.");
  }

  const originalDataUrl = await readFileAsDataUrl(file);

  // Prefer canvas compression when available (browser). Fall back to the raw data URL
  // in non-DOM environments (tests) or if decoding fails.
  if (typeof document === "undefined") {
    return originalDataUrl;
  }

  try {
    const image = await loadImageElement(originalDataUrl);
    const longest = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const scale = longest > MAX_IMAGE_EDGE_PX ? MAX_IMAGE_EDGE_PX / longest : 1;
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return originalDataUrl;
    ctx.drawImage(image, 0, 0, width, height);

    // Preserve PNG transparency when the source is PNG; otherwise use JPEG for size.
    const usePng = file.type === "image/png" || file.type === "image/webp";
    const compressed = usePng
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    // If compression somehow grew the payload, keep the original.
    return compressed.length < originalDataUrl.length ? compressed : originalDataUrl;
  } catch {
    return originalDataUrl;
  }
}

/**
 * Resolve the durable URL to persist for a slot.
 * - Remote HTTPS URLs win
 * - Local File uploads are converted to base64 data URLs
 * - Existing data:image URLs are kept
 * - blob: object URLs are never persisted (they die with the tab)
 */
export async function resolvePublishableSlotUrl(slot: MediaSlotState): Promise<string | undefined> {
  const remote = slot.remoteUrl?.trim();
  if (remote && isPersistableImageSrc(remote)) return remote;

  const preview = slot.previewUrl?.trim();
  if (preview && isPersistableImageSrc(preview) && !preview.startsWith("blob:")) return preview;

  if (slot.file) {
    return fileToPersistableDataUrl(slot.file);
  }

  // A blob preview without a File is not durable — refuse rather than invent a stock image.
  return undefined;
}
