import { AuctionStatus } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Live Auctions business logic. Auctions are standalone listable items
 * (see the `Auction` model) — bidding is a plain request/response flow
 * (no websockets): placing a bid updates `currentBidCents` /
 * `currentBidderId` in a transaction, and the UI re-fetches via
 * `router.refresh()` after each bid, same pattern as the escrow order flow.
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

export type AuctionActionResult<T = { auctionId: string }> =
  | ({ success: true } & T)
  | { success: false; error: string };

export interface PlaceBidInput {
  auctionId: string;
  bidderId: string;
  amountCents: number;
}

export async function placeBid({ auctionId, bidderId, amountCents }: PlaceBidInput): Promise<AuctionActionResult> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { success: false, error: "Enter a valid bid amount." };
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
  if (amountCents < minimumBidCents) {
    return {
      success: false,
      error: `Your bid must be at least R${(minimumBidCents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}.`,
    };
  }

  try {
    await db.$transaction(async (tx) => {
      // Optimistic concurrency via `version`: only succeeds if no other bid
      // has landed since we read `auction` above, so two concurrent bids
      // can't both "win" against a bid that only one of them actually saw.
      const claim = await tx.auction.updateMany({
        where: { id: auctionId, version: auction.version },
        data: { currentBidCents: amountCents, currentBidderId: bidderId, version: auction.version + 1 },
      });
      if (claim.count === 0) {
        throw new Error("BID_SUPERSEDED");
      }
      await tx.bid.create({ data: { auctionId, bidderId, amountCents } });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "BID_SUPERSEDED") {
      return { success: false, error: "Someone just placed a higher bid — refresh and try again." };
    }
    console.error("placeBid failed", err);
    return { success: false, error: "Something went wrong while placing your bid. Please try again." };
  }

  return { success: true, auctionId };
}
