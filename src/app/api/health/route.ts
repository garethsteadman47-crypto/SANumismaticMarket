import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Lightweight deploy diagnostics — no secrets leaked.
 * Use to tell apart missing AUTH_SECRET vs unreachable DATABASE_URL across
 * the duplicate Vercel projects attached to this repo.
 */
export async function GET() {
  const authConfigured = Boolean(process.env.AUTH_SECRET?.trim());
  const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim());

  let database: "up" | "down" = "down";
  let databaseError: string | undefined;
  if (databaseUrlConfigured) {
    try {
      await db.$runCommandRaw({ ping: 1 });
      database = "up";
    } catch (error) {
      databaseError = error instanceof Error ? error.name : "unknown";
      console.error("[health] database check failed", error);
    }
  }

  const ok = authConfigured && database === "up";
  return NextResponse.json(
    {
      ok,
      authConfigured,
      databaseUrlConfigured,
      database,
      ...(databaseError ? { databaseError } : {}),
      host: process.env.VERCEL_URL ?? null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    },
    { status: ok ? 200 : 503 },
  );
}
