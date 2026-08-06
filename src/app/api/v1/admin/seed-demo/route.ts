import { NextResponse } from "next/server";

import { runDemoSeed } from "@/lib/demo-seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Seeds the connected MongoDB (Atlas on Vercel) with the curated demo catalogue.
 *
 * Auth mirrors `/api/v1/cron/settle`: when `CRON_SECRET` is set, require
 * `Authorization: Bearer <CRON_SECRET>`. When unset (common on early deploys),
 * the route is open so preview/prod can be seeded after a deploy.
 *
 * POST or GET /api/v1/admin/seed-demo
 */
async function handleSeed(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runDemoSeed();
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("seed-demo failed", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleSeed(request);
}

export async function POST(request: Request) {
  return handleSeed(request);
}
