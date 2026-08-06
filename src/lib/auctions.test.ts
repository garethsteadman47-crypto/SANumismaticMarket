import { describe, expect, it } from "vitest";

import {
  getAuctionPhase,
  getAuctionSaleOutcome,
  getMinimumNextBidCents,
  isReserveSatisfied,
  resolveProxyBid,
} from "./auctions";

describe("getAuctionPhase", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("is SCHEDULED before startsAt", () => {
    expect(
      getAuctionPhase(
        { status: "SCHEDULED", startsAt: new Date("2026-06-16T00:00:00.000Z"), endsAt: new Date("2026-06-17T00:00:00.000Z") },
        now,
      ),
    ).toBe("SCHEDULED");
  });

  it("is LIVE between startsAt and endsAt", () => {
    expect(
      getAuctionPhase(
        { status: "LIVE", startsAt: new Date("2026-06-14T00:00:00.000Z"), endsAt: new Date("2026-06-17T00:00:00.000Z") },
        now,
      ),
    ).toBe("LIVE");
  });

  it("is ENDED after endsAt even if status hasn't been swept yet", () => {
    expect(
      getAuctionPhase(
        { status: "LIVE", startsAt: new Date("2026-06-10T00:00:00.000Z"), endsAt: new Date("2026-06-14T00:00:00.000Z") },
        now,
      ),
    ).toBe("ENDED");
  });

  it("respects an explicit CANCELLED status regardless of dates", () => {
    expect(
      getAuctionPhase(
        { status: "CANCELLED", startsAt: new Date("2026-06-01T00:00:00.000Z"), endsAt: new Date("2026-06-30T00:00:00.000Z") },
        now,
      ),
    ).toBe("CANCELLED");
  });
});

describe("getMinimumNextBidCents", () => {
  it("is the starting price when there's no bid yet", () => {
    expect(
      getMinimumNextBidCents({ startingPriceCents: 1_000_00, currentBidCents: null, bidIncrementCents: 50_00 }),
    ).toBe(1_000_00);
  });

  it("is current bid + increment once there's a bid", () => {
    expect(
      getMinimumNextBidCents({ startingPriceCents: 1_000_00, currentBidCents: 1_200_00, bidIncrementCents: 50_00 }),
    ).toBe(1_250_00);
  });
});

describe("resolveProxyBid", () => {
  it("opens at starting price for the first bidder", () => {
    const result = resolveProxyBid({
      challengerId: "b1",
      challengerMaxCents: 5_000_00,
      incumbentId: null,
      incumbentMaxCents: null,
      currentBidCents: null,
      startingPriceCents: 1_000_00,
      bidIncrementCents: 50_00,
    });
    expect(result.winnerId).toBe("b1");
    expect(result.visibleBidCents).toBe(1_000_00);
    expect(result.challengerOutbid).toBe(false);
  });

  it("lets a higher max take the lead at incumbentMax + increment", () => {
    const result = resolveProxyBid({
      challengerId: "b2",
      challengerMaxCents: 3_000_00,
      incumbentId: "b1",
      incumbentMaxCents: 2_000_00,
      currentBidCents: 1_000_00,
      startingPriceCents: 1_000_00,
      bidIncrementCents: 50_00,
    });
    expect(result.winnerId).toBe("b2");
    expect(result.visibleBidCents).toBe(2_050_00);
  });

  it("keeps the incumbent on a lower challenger max and raises visible bid", () => {
    const result = resolveProxyBid({
      challengerId: "b2",
      challengerMaxCents: 1_500_00,
      incumbentId: "b1",
      incumbentMaxCents: 2_500_00,
      currentBidCents: 1_000_00,
      startingPriceCents: 1_000_00,
      bidIncrementCents: 50_00,
    });
    expect(result.winnerId).toBe("b1");
    expect(result.visibleBidCents).toBe(1_550_00);
    expect(result.challengerOutbid).toBe(true);
  });

  it("gives ties to the incumbent", () => {
    const result = resolveProxyBid({
      challengerId: "b2",
      challengerMaxCents: 2_000_00,
      incumbentId: "b1",
      incumbentMaxCents: 2_000_00,
      currentBidCents: 1_000_00,
      startingPriceCents: 1_000_00,
      bidIncrementCents: 50_00,
    });
    expect(result.winnerId).toBe("b1");
    expect(result.challengerOutbid).toBe(true);
  });
});

describe("reserve price", () => {
  it("is satisfied when there is no reserve", () => {
    expect(isReserveSatisfied({ reservePriceCents: null, currentBidCents: 100 })).toBe(true);
  });

  it("requires current bid to meet or exceed reserve", () => {
    expect(isReserveSatisfied({ reservePriceCents: 5_000_00, currentBidCents: 4_999_00 })).toBe(false);
    expect(isReserveSatisfied({ reservePriceCents: 5_000_00, currentBidCents: 5_000_00 })).toBe(true);
  });

  it("reports RESERVE_NOT_MET on ended auctions below reserve", () => {
    expect(
      getAuctionSaleOutcome(
        {
          status: "LIVE",
          startsAt: new Date("2026-01-01"),
          endsAt: new Date("2026-01-02"),
          reservePriceCents: 5_000_00,
          currentBidCents: 4_000_00,
          currentBidderId: "b1",
        },
        new Date("2026-01-03"),
      ),
    ).toBe("RESERVE_NOT_MET");
  });
});
