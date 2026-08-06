import { AuctionStatus } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Live Auctions business logic. Auctions are standalone listable items
 * (see the `Auction` model) — bidding is a plain request/response flow
 * (no websockets): placing a bid updates `currentBidCents` /
 * `currentBidderId` in a transaction, and the UI re-fetches via
 * `router.refresh()` after each bid, same pattern as the escrow order flow.
 *
 * Proxy / max bidding: bidders submit a confidential `maxBidCents`. The
 * engine only raises the visible `currentBidCents` as far as needed to beat
 * the previous high max (by `bidIncrementCents`), never exposing the winner's
 * ceiling until another bid forces it.
 */

export type AuctionPhase = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";

interface AuctionPhaseInput {
  status: AuctionStatus;
  startsAt: Date;
  endsAt: Date;
}

/**
 * The *effective* phase of an auction right now, derived from `startsAt` /
 * `endsAt` rather than relying on a cron to flip `status` — so the UI is
 * always accurate even between scheduled sweeps.
 */
export function getAuctionPhase(auction: AuctionPhaseInput, now: Date = new Date()): AuctionPhase {
  if (auction.status === AuctionStatus.CANCELLED) return "CANCELLED";
  if (now < auction.startsAt) return "SCHEDULED";
  if (now >= auction.endsAt) return "ENDED";
  return "LIVE";
}

/** The lowest amount (in cents) that a new bid must meet or exceed. */
export function getMinimumNextBidCents(auction: {
  startingPriceCents: number;
  currentBidCents: number | null;
  bidIncrementCents: number;
}): number {
  if (auction.currentBidCents == null) {
    return auction.startingPriceCents;
  }
  return auction.currentBidCents + auction.bidIncrementCents;
}

/**
 * Standard South African auction step sizes (in cents), scaled by current bid.
 * Used for quick-bid buttons alongside the lot's configured `bidIncrementCents`.
 */
export function getSaAuctionIncrementCents(referenceBidCents: number): number {
  const rands = referenceBidCents / 100;
  if (rands < 100) return 1_000;
  if (rands < 500) return 2_000;
  if (rands < 1_000) return 5_000;
  if (rands < 5_000) return 10_000;
  if (rands < 10_000) return 25_000;
  if (rands < 50_000) return 50_000;
  return 100_000;
}

/** Three one-tap bid amounts: minimum next bid, then +1 and +2 steps. */
export function getQuickBidCents(minimumNextBidCents: number, bidIncrementCents: number): [number, number, number] {
  const step = Math.max(bidIncrementCents, getSaAuctionIncrementCents(minimumNextBidCents));
  return [minimumNextBidCents, minimumNextBidCents + step, minimumNextBidCents + step * 2];
}

export function isReserveSatisfied(auction: {
  reservePriceCents: number | null;
  currentBidCents: number | null;
  isReserveMet?: boolean;
}): boolean {
  if (auction.reservePriceCents == null) return true;
  if (auction.currentBidCents == null) return false;
  return auction.currentBidCents >= auction.reservePriceCents;
}

export type AuctionSaleOutcome = "WINNER" | "RESERVE_NOT_MET" | "NO_BIDS" | "LIVE" | "CANCELLED";

/** Outcome used on ended auction pages and seller desks. */
export function getAuctionSaleOutcome(
  auction: {
    status: AuctionStatus;
    startsAt: Date;
    endsAt: Date;
    reservePriceCents: number | null;
    currentBidCents: number | null;
    currentBidderId: string | null;
    isReserveMet?: boolean;
  },
  now: Date = new Date(),
): AuctionSaleOutcome {
  const phase = getAuctionPhase(auction, now);
  if (phase === "CANCELLED") return "CANCELLED";
  if (phase === "LIVE" || phase === "SCHEDULED") return "LIVE";
  if (auction.currentBidCents == null || !auction.currentBidderId) return "NO_BIDS";
  if (!isReserveSatisfied(auction)) return "RESERVE_NOT_MET";
  return "WINNER";
}

export type ProxyBidResolution = {
  winnerId: string;
  visibleBidCents: number;
  /** Bid rows to insert (losing challenger first when applicable, then winner state). */
  bidsToCreate: { bidderId: string; amountCents: number; maxBidCents: number }[];
  challengerOutbid: boolean;
};

/**
 * Pure proxy duel between an incumbent high bidder and a challenger max bid.
 * Incumbent wins ties (existing high bidder keeps the lead).
 */
export function resolveProxyBid(input: {
  challengerId: string;
  challengerMaxCents: number;
  incumbentId: string | null;
  incumbentMaxCents: number | null;
  currentBidCents: number | null;
  startingPriceCents: number;
  bidIncrementCents: number;
}): ProxyBidResolution {
  const {
    challengerId,
    challengerMaxCents,
    incumbentId,
    incumbentMaxCents,
    currentBidCents,
    startingPriceCents,
    bidIncrementCents,
  } = input;

  // Opening bid — no competition yet.
  if (incumbentId == null || incumbentMaxCents == null || currentBidCents == null) {
    return {
      winnerId: challengerId,
      visibleBidCents: startingPriceCents,
      bidsToCreate: [
        {
          bidderId: challengerId,
          amountCents: startingPriceCents,
          maxBidCents: challengerMaxCents,
        },
      ],
      challengerOutbid: false,
    };
  }

  // Same bidder raising their own max — keep visible price, refresh ceiling.
  if (challengerId === incumbentId) {
    const nextMax = Math.max(incumbentMaxCents, challengerMaxCents);
    return {
      winnerId: incumbentId,
      visibleBidCents: currentBidCents,
      bidsToCreate: [
        {
          bidderId: challengerId,
          amountCents: currentBidCents,
          maxBidCents: nextMax,
        },
      ],
      challengerOutbid: false,
    };
  }

  if (challengerMaxCents > incumbentMaxCents) {
    const visible = Math.min(challengerMaxCents, incumbentMaxCents + bidIncrementCents);
    return {
      winnerId: challengerId,
      visibleBidCents: visible,
      bidsToCreate: [
        {
          bidderId: challengerId,
          amountCents: visible,
          maxBidCents: challengerMaxCents,
        },
      ],
      challengerOutbid: false,
    };
  }

  // Challenger loses (or ties) — incumbent stays ahead; visible climbs to challengerMax + increment.
  const visible = Math.min(incumbentMaxCents, challengerMaxCents + bidIncrementCents);
  return {
    winnerId: incumbentId,
    visibleBidCents: Math.max(visible, currentBidCents),
    bidsToCreate: [
      {
        bidderId: challengerId,
        amountCents: Math.min(challengerMaxCents, visible),
        maxBidCents: challengerMaxCents,
      },
      {
        bidderId: incumbentId,
        amountCents: Math.max(visible, currentBidCents),
        maxBidCents: incumbentMaxCents,
      },
    ],
    challengerOutbid: true,
  };
}

export async function getAuctions() {
  const auctions = await db.auction.findMany({
    where: { status: { in: [AuctionStatus.SCHEDULED, AuctionStatus.LIVE] } },
    include: {
      seller: { select: { id: true, name: true, subscriptionTier: true } },
      currentBidder: { select: { id: true, name: true } },
      _count: { select: { bids: true } },
    },
    orderBy: [{ endsAt: "asc" }],
  });
  return auctions;
}

export async function getAuctionById(auctionId: string) {
  return db.auction.findUnique({
    where: { id: auctionId },
    include: {
      seller: { select: { id: true, name: true, subscriptionTier: true } },
      currentBidder: { select: { id: true, name: true } },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { bidder: { select: { id: true, name: true } } },
      },
    },
  });
}

export type AuctionActionResult<T = { auctionId: string; currentBidCents?: number; isReserveMet?: boolean; outbid?: boolean }> =
  | ({ success: true } & T)
  | { success: false; error: string };

export interface PlaceBidInput {
  auctionId: string;
  bidderId: string;
  /** Confidential proxy ceiling (ZAR cents). Also used as a one-shot bid amount. */
  maxBidCents: number;
}

async function getIncumbentMaxBidCents(
  auctionId: string,
  incumbentId: string,
  fallbackCurrentBidCents: number,
): Promise<number> {
  const latest = await db.bid.findFirst({
    where: { auctionId, bidderId: incumbentId },
    orderBy: { createdAt: "desc" },
    select: { maxBidCents: true, amountCents: true },
  });
  if (!latest) return fallbackCurrentBidCents;
  return Math.max(latest.maxBidCents ?? latest.amountCents, latest.amountCents, fallbackCurrentBidCents);
}

export async function placeBid({ auctionId, bidderId, maxBidCents }: PlaceBidInput): Promise<AuctionActionResult> {
  if (!Number.isInteger(maxBidCents) || maxBidCents <= 0) {
    return { success: false, error: "Enter a valid maximum bid amount." };
  }

  const auction = await db.auction.findUnique({ where: { id: auctionId } });
  if (!auction) {
    return { success: false, error: "Auction not found." };
  }
  if (auction.sellerId === bidderId) {
    return { success: false, error: "You can't bid on your own auction." };
  }

  const phase = getAuctionPhase(auction);
  if (phase !== "LIVE") {
    return {
      success: false,
      error:
        phase === "SCHEDULED"
          ? "This auction hasn't started yet."
          : phase === "ENDED"
            ? "This auction has already ended."
            : "This auction was cancelled.",
    };
  }

  const minimumBidCents = getMinimumNextBidCents(auction);
  // Raising your own max while already leading is allowed even if max < min next
  // as long as max stays >= current visible bid.
  const isSelfRaise = auction.currentBidderId === bidderId;
  if (!isSelfRaise && maxBidCents < minimumBidCents) {
    return {
      success: false,
      error: `Your maximum bid must be at least R${(minimumBidCents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}.`,
    };
  }
  if (isSelfRaise && auction.currentBidCents != null && maxBidCents < auction.currentBidCents) {
    return {
      success: false,
      error: "Your maximum bid can't be lower than the current bid.",
    };
  }

  const incumbentMax =
    auction.currentBidderId && auction.currentBidCents != null
      ? await getIncumbentMaxBidCents(auctionId, auction.currentBidderId, auction.currentBidCents)
      : null;

  const resolution = resolveProxyBid({
    challengerId: bidderId,
    challengerMaxCents: maxBidCents,
    incumbentId: auction.currentBidderId,
    incumbentMaxCents: incumbentMax,
    currentBidCents: auction.currentBidCents,
    startingPriceCents: auction.startingPriceCents,
    bidIncrementCents: auction.bidIncrementCents,
  });

  const isReserveMet =
    auction.reservePriceCents == null || resolution.visibleBidCents >= auction.reservePriceCents;

  try {
    await db.$transaction(async (tx) => {
      const claim = await tx.auction.updateMany({
        where: { id: auctionId, version: auction.version },
        data: {
          currentBidCents: resolution.visibleBidCents,
          currentBidderId: resolution.winnerId,
          isReserveMet,
          version: auction.version + 1,
        },
      });
      if (claim.count === 0) {
        throw new Error("BID_SUPERSEDED");
      }
      for (const bid of resolution.bidsToCreate) {
        await tx.bid.create({
          data: {
            auctionId,
            bidderId: bid.bidderId,
            amountCents: bid.amountCents,
            maxBidCents: bid.maxBidCents,
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "BID_SUPERSEDED") {
      return { success: false, error: "Someone just placed a higher bid — refresh and try again." };
    }
    console.error("placeBid failed", err);
    return { success: false, error: "Something went wrong while placing your bid. Please try again." };
  }

  return {
    success: true,
    auctionId,
    currentBidCents: resolution.visibleBidCents,
    isReserveMet,
    outbid: resolution.challengerOutbid,
  };
}
