import { NextResponse } from "next/server";

import { settleAllExpiredHolds } from "@/lib/orders";

/**
 * Scheduled settlement job: finds every `HOLD_48H` order whose 48-hour
 * escrow hold has expired (and isn't disputed) and settles it — generating
 * the dual invoices and releasing the seller's payout.
 *
 * Registered in `vercel.json` on a daily schedule (`0 0 * * *`). Note this
 * means an expired hold may sit settled-but-unpaid for up to ~24h before
 * this job runs; the `/orders/[id]` page's manual "Settle now" button calls
 * the same underlying `settleExpiredHold` logic in the meantime.
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
