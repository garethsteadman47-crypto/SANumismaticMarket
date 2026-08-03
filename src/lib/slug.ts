/**
 * Generates a URL-safe slug from a listing title, with a short random
 * suffix to make collisions on `Listing.slug`'s unique index astronomically
 * unlikely without needing a database round trip up front.
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "listing"}-${suffix}`;
}
