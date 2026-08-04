import { describe, expect, it } from "vitest";
import { OrderStatus, SubscriptionTier } from "@prisma/client";
import {
  ESCROW_HOLD_DURATION_MS,
  canTransitionToSettled,
  computeSettlementSchedule,
  determinePayoutVelocity,
  isHoldExpired,
} from "./escrow";

describe("determinePayoutVelocity", () => {
  it("settles Gold and Dealer instantly", () => {
    expect(determinePayoutVelocity(SubscriptionTier.GOLD)).toBe("INSTANT");
    expect(determinePayoutVelocity(SubscriptionTier.DEALER)).toBe("INSTANT");
  });

  it("holds Standard and Silver sellers for 48 hours", () => {
    expect(determinePayoutVelocity(SubscriptionTier.STANDARD)).toBe("HOLD_48H");
    expect(determinePayoutVelocity(SubscriptionTier.SILVER)).toBe("HOLD_48H");
  });
});

describe("computeSettlementSchedule", () => {
  const deliveredAt = new Date("2026-01-01T10:00:00.000Z");

  it("settles a Gold Dealer's order immediately upon OTP scan", () => {
    const schedule = computeSettlementSchedule(deliveredAt, SubscriptionTier.GOLD);
    expect(schedule.payoutVelocity).toBe("INSTANT");
    expect(schedule.nextStatus).toBe(OrderStatus.SETTLED);
    expect(schedule.settledAt).toEqual(deliveredAt);
    expect(schedule.escrowHoldReleaseAt).toBeNull();
  });

  it("pushes a Standard seller's order into a 48-hour hold upon OTP scan", () => {
    const schedule = computeSettlementSchedule(deliveredAt, SubscriptionTier.STANDARD);
    expect(schedule.payoutVelocity).toBe("HOLD_48H");
    expect(schedule.nextStatus).toBe(OrderStatus.HOLD_48H);
    expect(schedule.settledAt).toBeNull();
    expect(schedule.escrowHoldReleaseAt).toEqual(new Date(deliveredAt.getTime() + ESCROW_HOLD_DURATION_MS));
  });

  it("pushes a Silver seller's order into a 48-hour hold upon OTP scan", () => {
    const schedule = computeSettlementSchedule(deliveredAt, SubscriptionTier.SILVER);
    expect(schedule.nextStatus).toBe(OrderStatus.HOLD_48H);
    expect(schedule.escrowHoldReleaseAt).not.toBeNull();
  });
});

describe("isHoldExpired", () => {
  it("returns false when there is no hold to expire", () => {
    expect(isHoldExpired(null)).toBe(false);
  });

  it("returns false before the release time", () => {
    const releaseAt = new Date("2026-01-03T10:00:00.000Z");
    const now = new Date("2026-01-03T09:59:59.000Z");
    expect(isHoldExpired(releaseAt, now)).toBe(false);
  });

  it("returns true at and after the release time", () => {
    const releaseAt = new Date("2026-01-03T10:00:00.000Z");
    expect(isHoldExpired(releaseAt, releaseAt)).toBe(true);
    expect(isHoldExpired(releaseAt, new Date("2026-01-03T10:00:01.000Z"))).toBe(true);
  });
});

describe("canTransitionToSettled", () => {
  const releaseAt = new Date("2026-01-03T10:00:00.000Z");

  it("is false for any status other than HOLD_48H", () => {
    expect(
      canTransitionToSettled({ status: OrderStatus.DELIVERED, escrowHoldReleaseAt: releaseAt }, releaseAt)
    ).toBe(false);
    expect(
      canTransitionToSettled({ status: OrderStatus.DISPUTE, escrowHoldReleaseAt: releaseAt }, releaseAt)
    ).toBe(false);
    expect(canTransitionToSettled({ status: OrderStatus.SETTLED, escrowHoldReleaseAt: releaseAt }, releaseAt)).toBe(
      false
    );
  });

  it("is false while HOLD_48H and the hold has not yet expired", () => {
    const before = new Date(releaseAt.getTime() - 1_000);
    expect(canTransitionToSettled({ status: OrderStatus.HOLD_48H, escrowHoldReleaseAt: releaseAt }, before)).toBe(
      false
    );
  });

  it("is true once HOLD_48H and the hold has expired", () => {
    const after = new Date(releaseAt.getTime() + 1_000);
    expect(canTransitionToSettled({ status: OrderStatus.HOLD_48H, escrowHoldReleaseAt: releaseAt }, after)).toBe(
      true
    );
  });
});
