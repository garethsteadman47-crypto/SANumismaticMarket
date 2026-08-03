import type { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { jsonError, type ApiErrorBody } from "@/lib/api/http";

/**
 * Resolve the authenticated user for `/api/v1/*` routes.
 *
 * Today this uses the Auth.js session cookie (same as Server Actions), which
 * Expo / React Native can obtain via a cookie-aware fetch client after a
 * credentials sign-in. A dedicated Bearer/JWT mobile token can be layered on
 * later without changing the business-logic modules these routes call.
 */
export async function requireApiUser(): Promise<{ id: string } | NextResponse<ApiErrorBody>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("You must be signed in.", 401);
    }
    return { id: session.user.id };
  } catch (err) {
    console.error("requireApiUser failed", err);
    return jsonError("Could not verify your session. Please sign in again.", 401);
  }
}
