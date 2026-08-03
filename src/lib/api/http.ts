import { NextResponse } from "next/server";

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

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
