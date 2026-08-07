import { NextResponse } from "next/server";

import { runSavedSearchAlertPass } from "@/lib/saved-searches";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Key Date / saved-search alert pass.
 *
 * Scans recent ACTIVE listings against alert-enabled SavedSearch rows and
 * returns match summaries. Wire a Vercel Cron to hit this daily.
 *
 * Auth mirrors settle: Bearer CRON_SECRET when set.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runSavedSearchAlertPass({ sinceHours: 48 });
    // Structured log for ops / future email/SMS fan-out.
    if (result.alerts.length > 0) {
      console.info("[saved-search-alerts]", JSON.stringify(result.alerts));
    }
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("saved-search-alerts failed", err);
    return NextResponse.json({ success: false, error: "Alert pass failed" }, { status: 500 });
  }
}
