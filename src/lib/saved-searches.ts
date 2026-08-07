import { db } from "@/lib/db";
import { parseBrowseFilters, serializeBrowseFilters, type BrowseFilterState } from "@/lib/browse-filters";
import { randsToCents } from "@/lib/utils/currency";

/**
 * Saved searches + Key Date alert matching.
 *
 * Collectors save structured filters (era / grade / keyword / price). A
 * lightweight cron (`/api/v1/cron/saved-search-alerts`) scans new ACTIVE
 * listings and returns matches so we can surface "new key date hit" alerts.
 */

export type SaveSearchResult =
  | { success: true; savedSearchId: string }
  | { success: false; error: string };

export type SavedSearchInput = {
  userId: string;
  queryName?: string;
  label?: string;
  category?: string;
  era?: string;
  grade?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  queryString?: string;
  filters?: BrowseFilterState;
};

function buildQueryString(input: SavedSearchInput): string {
  if (input.queryString?.trim()) return input.queryString.trim().replace(/^\?/, "");
  if (input.filters) return serializeBrowseFilters(input.filters);

  const filters: BrowseFilterState = {
    taxonomy: input.era || input.category || undefined,
    q: input.keyword?.trim() || undefined,
    certifications: [],
    gradeBrackets: [],
    metals: [],
    minPriceRands: input.minPrice != null ? Math.round(input.minPrice) : undefined,
    maxPriceRands: input.maxPrice != null ? Math.round(input.maxPrice) : undefined,
    formats: [],
  };
  return serializeBrowseFilters(filters);
}

export async function createSavedSearch(input: SavedSearchInput): Promise<SaveSearchResult> {
  const queryName = (input.queryName ?? input.label ?? "").trim() || "My saved search";
  const queryString = buildQueryString(input);

  // Prefer structured fields; fall back to parsing the query string.
  const parsed = parseBrowseFilters(Object.fromEntries(new URLSearchParams(queryString)));
  const era = input.era?.trim() || parsed.taxonomy || undefined;
  const category = input.category?.trim() || undefined;
  const keyword = input.keyword?.trim() || parsed.q || undefined;
  const grade = input.grade?.trim() || undefined;
  const minPrice = input.minPrice ?? parsed.minPriceRands ?? undefined;
  const maxPrice = input.maxPrice ?? parsed.maxPriceRands ?? undefined;

  const savedSearch = await db.savedSearch.create({
    data: {
      userId: input.userId,
      queryName,
      label: queryName,
      category,
      era,
      grade,
      keyword,
      minPrice,
      maxPrice,
      queryString,
      alertEnabled: true,
    },
  });

  return { success: true, savedSearchId: savedSearch.id };
}

export async function getSavedSearchesForUser(userId: string) {
  return db.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function deleteSavedSearch(userId: string, id: string) {
  const existing = await db.savedSearch.findFirst({ where: { id, userId } });
  if (!existing) return { success: false as const, error: "Saved search not found." };
  await db.savedSearch.delete({ where: { id } });
  return { success: true as const };
}

type ListingMatchCandidate = {
  id: string;
  title: string;
  description: string;
  denomination: string | null;
  condition: string | null;
  subcategory: string | null;
  year: number | null;
  priceCents: number;
  createdAt: Date;
};

/** Exported for unit tests — matches a listing against saved-search filter fields. */
export function listingMatchesSearch(
  listing: ListingMatchCandidate,
  search: {
    keyword: string | null;
    era: string | null;
    grade: string | null;
    category: string | null;
    minPrice: number | null;
    maxPrice: number | null;
  },
): boolean {
  if (search.minPrice != null && listing.priceCents < randsToCents(search.minPrice)) return false;
  if (search.maxPrice != null && listing.priceCents > randsToCents(search.maxPrice)) return false;

  if (search.era) {
    const era = search.era.toLowerCase();
    const sub = (listing.subcategory ?? "").toLowerCase();
    const yearStr = String(listing.year ?? "");
    const digits = search.era.replace(/\D/g, "");
    const eraHit = sub.includes(era) || listing.subcategory === search.era;
    const yearHit = digits.length >= 4 && yearStr.includes(digits.slice(0, 4));
    if (!eraHit && !yearHit) return false;
  }

  if (search.grade) {
    const grade = search.grade.toLowerCase();
    if (!(listing.condition ?? "").toLowerCase().includes(grade)) return false;
  }

  if (search.keyword) {
    const kw = search.keyword.toLowerCase();
    const blob = `${listing.title} ${listing.description} ${listing.denomination ?? ""}`.toLowerCase();
    if (!blob.includes(kw)) return false;
  }

  if (search.category) {
    const cat = search.category.toLowerCase();
    const blob = `${listing.subcategory ?? ""} ${listing.title}`.toLowerCase();
    if (!blob.includes(cat) && listing.subcategory !== search.category) return false;
  }

  return true;
}

/**
 * Scan recent ACTIVE listings against alert-enabled saved searches.
 * Returns match rows and bumps `lastAlertedAt` so we don't re-notify.
 */
export async function runSavedSearchAlertPass(options?: { sinceHours?: number }) {
  const sinceHours = options?.sinceHours ?? 24;
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const [searches, listings] = await Promise.all([
    db.savedSearch.findMany({
      where: { alertEnabled: true },
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    db.listing.findMany({
      where: { status: "ACTIVE", createdAt: { gte: since } },
      select: {
        id: true,
        title: true,
        description: true,
        denomination: true,
        condition: true,
        subcategory: true,
        year: true,
        priceCents: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const alerts: {
    savedSearchId: string;
    userId: string;
    userEmail: string;
    queryName: string;
    listingIds: string[];
    listingTitles: string[];
  }[] = [];

  for (const search of searches) {
    const matches = listings.filter((listing) => {
      if (search.lastAlertedAt && listing.createdAt <= search.lastAlertedAt) return false;
      return listingMatchesSearch(listing, search);
    });
    if (matches.length === 0) continue;

    await db.savedSearch.update({
      where: { id: search.id },
      data: { lastAlertedAt: new Date() },
    });

    alerts.push({
      savedSearchId: search.id,
      userId: search.userId,
      userEmail: search.user.email,
      queryName: search.queryName ?? search.label,
      listingIds: matches.map((m) => m.id),
      listingTitles: matches.map((m) => m.title),
    });
  }

  return { checkedSearches: searches.length, newListings: listings.length, alerts };
}
