import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export type ApiErrorBody = {
  success: false;
  error: string;
  field?: string;
  details?: unknown;
};

export type ApiSuccessBody<T> = {
  success: true;
  data: T;
};

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ success: true, data }, { status: 200, ...init });
}

export function jsonCreated<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ success: true, data }, { status: 201, ...init });
}

export function jsonError(
  error: string,
  status = 400,
  extras?: { field?: string; details?: unknown }
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { success: false, error, field: extras?.field, details: extras?.details },
    { status }
  );
}

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

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
