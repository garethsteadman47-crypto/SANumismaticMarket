import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonCreated, jsonError, jsonOk, isNextResponse } from "@/lib/api/http";
import { requireApiUser } from "@/lib/api/require-user";
import { createSavedSearch, deleteSavedSearch, getSavedSearchesForUser } from "@/lib/saved-searches";

export const dynamic = "force-dynamic";

const createBodySchema = z.object({
  queryName: z.string().trim().max(80).optional(),
  label: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  era: z.string().trim().max(80).optional(),
  grade: z.string().trim().max(40).optional(),
  keyword: z.string().trim().max(120).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  queryString: z.string().max(2000).optional(),
});

/**
 * GET /api/saved-searches — list the signed-in user's saved searches.
 * POST /api/saved-searches — create a structured saved search + key-date alert.
 * DELETE /api/saved-searches?id=… — remove one.
 */
export async function GET() {
  const user = await requireApiUser();
  if (isNextResponse(user)) return user;

  try {
    const searches = await getSavedSearchesForUser(user.id);
    return jsonOk({ searches });
  } catch (err) {
    console.error("GET /api/saved-searches failed", err);
    return jsonError("Failed to load saved searches.", 500);
  }
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (isNextResponse(user)) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be JSON.", 400);
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(first?.message ?? "Invalid saved-search payload.", 422);
  }

  try {
    const result = await createSavedSearch({ userId: user.id, ...parsed.data });
    if (!result.success) return jsonError(result.error, 400);
    return jsonCreated({ savedSearchId: result.savedSearchId });
  } catch (err) {
    console.error("POST /api/saved-searches failed", err);
    return jsonError("Failed to save search.", 500);
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("You must be signed in.", 401);
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing saved search id.", 400);

  try {
    const result = await deleteSavedSearch(session.user.id, id);
    if (!result.success) return jsonError(result.error, 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/saved-searches failed", err);
    return jsonError("Failed to delete saved search.", 500);
  }
}
