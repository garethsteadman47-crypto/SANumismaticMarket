import { describe, expect, it } from "vitest";

import { getAuctionPhase, getMinimumNextBidCents } from "./auctions";

describe("getAuctionPhase", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("is SCHEDULED before startsAt", () => {
    expect(
      getAuctionPhase(
        { status: "SCHEDULED", startsAt: new Date("2026-06-16T00:00:00.000Z"), endsAt: new Date("2026-06-17T00:00:00.000Z") },
        now
      )
    ).toBe("SCHEDULED");
  });

  it("is LIVE between startsAt and endsAt", () => {
    expect(
      getAuctionPhase(
        { status: "LIVE", startsAt: new Date("2026-06-14T00:00:00.000Z"), endsAt: new Date("2026-06-17T00:00:00.000Z") },
        now
      )
    ).toBe("LIVE");
  });

  it("is ENDED after endsAt even if status hasn't been swept yet", () => {
    expect(
      getAuctionPhase(
        { status: "LIVE", startsAt: new Date("2026-06-10T00:00:00.000Z"), endsAt: new Date("2026-06-14T00:00:00.000Z") },
        now
      )
    ).toBe("ENDED");
  });

  it("respects an explicit CANCELLED status regardless of dates", () => {
    expect(
      getAuctionPhase(
        { status: "CANCELLED", startsAt: new Date("2026-06-01T00:00:00.000Z"), endsAt: new Date("2026-06-30T00:00:00.000Z") },
        now
      )
    ).toBe("CANCELLED");
  });
});

describe("getMinimumNextBidCents", () => {
  it("is the starting price when there's no bid yet", () => {
    expect(
      getMinimumNextBidCents({ startingPriceCents: 1_000_00, currentBidCents: null, bidIncrementCents: 50_00 })
    ).toBe(1_000_00);
  });

  it("is current bid + increment once there's a bid", () => {
    expect(
      getMinimumNextBidCents({ startingPriceCents: 1_000_00, currentBidCents: 1_200_00, bidIncrementCents: 50_00 })
    ).toBe(1_250_00);
  });
});
