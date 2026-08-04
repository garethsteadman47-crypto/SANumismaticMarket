import { OrderStatus, SubscriptionTier } from "@prisma/client";

/**
 * Escrow payout-velocity logic.
 *
 * Order state machine (see `prisma/schema.prisma`):
 *
 *   DRAFT -> PAID_ESCROW -> IN_TRANSIT -> DELIVERED -> (HOLD_48H | SETTLED)
 *                                                    \-> DISPUTE (any time)
 *
 * `DELIVERED` is reached the instant the courier scans the buyer's
 * delivery OTP. What happens next depends on the seller's subscription
 * tier at that moment:
 *
 *   - Gold Dealer  -> funds settle INSTANTLY.
 *   - Standard/Silver -> order moves to a 48-hour hold before settling.
 */

export const ESCROW_HOLD_DURATION_MS = 48 * 60 * 60 * 1000;

export function determinePayoutVelocity(subscriptionTier: SubscriptionTier): "INSTANT" | "HOLD_48H" {
  return subscriptionTier === SubscriptionTier.GOLD || subscriptionTier === SubscriptionTier.DEALER
    ? "INSTANT"
    : "HOLD_48H";
}

export interface SettlementSchedule {
  payoutVelocity: "INSTANT" | "HOLD_48H";
  /** The `OrderStatus` the order should move to immediately after the OTP scan. */
  nextStatus: typeof OrderStatus.SETTLED | typeof OrderStatus.HOLD_48H;
  /** Set only when `payoutVelocity` is INSTANT. */
  settledAt: Date | null;
  /** Set only when `payoutVelocity` is HOLD_48H — the earliest the order may be settled. */
  escrowHoldReleaseAt: Date | null;
}

/**
 * Computes what should happen to an order the moment the courier scans the
 * buyer's delivery OTP (i.e. the order transitions into `DELIVERED`).
 */
export function computeSettlementSchedule(
  deliveredAt: Date,
  subscriptionTier: SubscriptionTier
): SettlementSchedule {
  const payoutVelocity = determinePayoutVelocity(subscriptionTier);

  if (payoutVelocity === "INSTANT") {
    return {
      payoutVelocity,
      nextStatus: OrderStatus.SETTLED,
      settledAt: deliveredAt,
      escrowHoldReleaseAt: null,
    };
  }

  return {
    payoutVelocity,
    nextStatus: OrderStatus.HOLD_48H,
    settledAt: null,
    escrowHoldReleaseAt: new Date(deliveredAt.getTime() + ESCROW_HOLD_DURATION_MS),
  };
}

/** Whether a HOLD_48H order's hold period has elapsed as of `now`. */
export function isHoldExpired(escrowHoldReleaseAt: Date | null, now: Date = new Date()): boolean {
  if (!escrowHoldReleaseAt) return false;
  return now.getTime() >= escrowHoldReleaseAt.getTime();
}

export interface SettlementCheckInput {
  status: OrderStatus;
  escrowHoldReleaseAt: Date | null;
}

/**
 * Whether an order in `HOLD_48H` is currently eligible to be moved to
 * `SETTLED` (e.g. by a scheduled job). Orders in `DISPUTE` are never
 * eligible until the dispute is resolved and moved back to `HOLD_48H` (or
 * settled directly by an admin action) — that resolution flow is out of
 * scope for this utility.
 */
export function canTransitionToSettled(order: SettlementCheckInput, now: Date = new Date()): boolean {
  if (order.status !== OrderStatus.HOLD_48H) return false;
  return isHoldExpired(order.escrowHoldReleaseAt, now);
}

/** Human-readable copy for the seller-facing payout timeline UI. */
export function describePayoutVelocity(subscriptionTier: SubscriptionTier): string {
  return determinePayoutVelocity(subscriptionTier) === "INSTANT"
    ? "Funds settle instantly once delivery is confirmed."
    : "Funds settle after a 48-hour security hold once delivery is confirmed.";
}
