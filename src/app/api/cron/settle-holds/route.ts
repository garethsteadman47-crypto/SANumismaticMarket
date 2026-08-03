import { NextResponse } from "next/server";

import { settleAllExpiredHolds } from "@/lib/orders";

/**
 * Scheduled settlement job: finds every `HOLD_48H` order whose 48-hour
 * escrow hold has expired (and isn't disputed) and settles it — generating
 * the dual invoices and releasing the seller's payout.
 *
 * Intended to be hit by a real scheduler (e.g. Vercel Cron) on an interval.
 * The `/orders/[id]` page also exposes a manual "Settle now" button that
 * calls the same underlying `settleExpiredHold` logic for demo purposes.
 *
 * Set `CRON_SECRET` in production and configure the scheduler to send
 * `Authorization: Bearer <CRON_SECRET>` — this route is unauthenticated
 * when `CRON_SECRET` is unset, which is only appropriate for local dev.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { settledOrderIds } = await settleAllExpiredHolds();
  return NextResponse.json({ settledCount: settledOrderIds.length, settledOrderIds });
}
