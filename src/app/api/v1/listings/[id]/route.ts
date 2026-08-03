import { db } from "@/lib/db";
import { OBJECT_ID_PATTERN, jsonError, jsonOk } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/listings/:id — single listing detail for mobile PDP.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    return jsonError("Invalid listing id.", 400);
  }

  try {
    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, subscriptionTier: true } },
        verification: {
          select: {
            provider: true,
            certificateId: true,
            grade: true,
            mintage: true,
            historicalNotes: true,
            shieldAwarded: true,
            feeCents: true,
          },
        },
      },
    });

    if (!listing) {
      return jsonError("Listing not found.", 404);
    }

    return jsonOk({ listing });
  } catch (err) {
    console.error("GET /api/v1/listings/[id] failed", err);
    return jsonError("Failed to load listing.", 500);
  }
}
