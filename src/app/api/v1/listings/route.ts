import { ListingCategory, ListingStatus, Prisma } from "@prisma/client";

import { createListing } from "@/lib/listings";
import { createListingSchema } from "@/lib/validation/listing";
import { db } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, requireApiUser, isNextResponse } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const LISTING_SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  category: true,
  listingType: true,
  metal: true,
  condition: true,
  year: true,
  denomination: true,
  priceCents: true,
  currency: true,
  images: true,
  status: true,
  certificateId: true,
  createdAt: true,
  seller: { select: { id: true, name: true, subscriptionTier: true } },
  verification: {
    select: {
      provider: true,
      certificateId: true,
      grade: true,
      shieldAwarded: true,
    },
  },
} satisfies Prisma.ListingSelect;

/**
 * GET /api/v1/listings — public catalog of ACTIVE listings (mobile-ready).
 * Query: `?category=COINS&limit=24&cursor=<listingId>`
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 24) || 24, 1), 100);
    const cursor = searchParams.get("cursor") ?? undefined;

    let category: ListingCategory | undefined;
    if (categoryParam) {
      if (!(Object.values(ListingCategory) as string[]).includes(categoryParam)) {
        return jsonError(`Unknown category "${categoryParam}".`, 400, { field: "category" });
      }
      category = categoryParam as ListingCategory;
    }

    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.ACTIVE,
      ...(category ? { category } : {}),
    };

    const listings = await db.listing.findMany({
      where,
      select: LISTING_SUMMARY_SELECT,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = listings.length > limit;
    const page = hasMore ? listings.slice(0, limit) : listings;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return jsonOk({ listings: page, nextCursor });
  } catch (err) {
    console.error("GET /api/v1/listings failed", err);
    return jsonError("Failed to load listings.", 500);
  }
}

/**
 * POST /api/v1/listings — create a listing (same logic as `createListingAction`).
 * Auth: signed-in session required.
 */
export async function POST(request: Request) {
  const user = await requireApiUser();
  if (isNextResponse(user)) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be JSON.", 400);
  }

  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(first?.message ?? "Invalid listing payload.", 422, {
      field: first?.path.join("."),
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await createListing(user.id, parsed.data);
    if (!result.success) {
      return jsonError(result.error, 400, { field: result.field });
    }
    return jsonCreated(result);
  } catch (err) {
    console.error("POST /api/v1/listings failed", err);
    return jsonError("Something went wrong while creating your listing.", 500);
  }
}
