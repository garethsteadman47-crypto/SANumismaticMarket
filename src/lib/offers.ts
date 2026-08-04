import { ListingStatus, OfferStatus } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * "Make an Offer" negotiation business logic, kept out of the `"use
 * server"` action module (`actions/offer.ts`) — mirrors `lib/listings.ts` /
 * `lib/orders.ts` so it's directly testable and reusable from `/api/v1`
 * later.
 */

/** Offers below this fraction of the listing's asking price are rejected. */
export const MINIMUM_OFFER_RATIO = 0.7;

/** The lowest offer (in cents) that's allowed for a given listing price. Rounds up in the buyer's favor is wrong — round up so 70% is a true floor. */
export function computeMinimumOfferCents(listingPriceCents: number): number {
  return Math.ceil(listingPriceCents * MINIMUM_OFFER_RATIO);
}

export type OfferActionResult<T = { offerId: string }> =
  | ({ success: true } & T)
  | { success: false; error: string };

export interface CreateOfferInput {
  listingId: string;
  buyerId: string;
  offerAmountCents: number;
  message?: string;
}

export async function createOffer({
  listingId,
  buyerId,
  offerAmountCents,
  message,
}: CreateOfferInput): Promise<OfferActionResult> {
  if (!Number.isInteger(offerAmountCents) || offerAmountCents <= 0) {
    return { success: false, error: "Enter a valid offer amount." };
  }

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return { success: false, error: "This listing no longer exists." };
  }
  if (listing.status !== ListingStatus.ACTIVE) {
    return { success: false, error: "This listing is no longer available for offers." };
  }
  if (!listing.acceptsOffers) {
    return { success: false, error: "This seller isn't accepting offers on this listing." };
  }
  if (listing.sellerId === buyerId) {
    return { success: false, error: "You can't make an offer on your own listing." };
  }

  const minimumOfferCents = computeMinimumOfferCents(listing.priceCents);
  if (offerAmountCents < minimumOfferCents) {
    return {
      success: false,
      error: `Offers cannot be lower than ${MINIMUM_OFFER_RATIO * 100}% of asking price (minimum allowed: R${(minimumOfferCents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}).`,
    };
  }

  const existingPending = await db.offer.findFirst({
    where: { listingId, buyerId, status: { in: [OfferStatus.PENDING, OfferStatus.COUNTERED] } },
  });
  if (existingPending) {
    return { success: false, error: "You already have an open offer on this listing." };
  }

  const offer = await db.offer.create({
    data: {
      listingId,
      buyerId,
      sellerId: listing.sellerId,
      listingPriceCentsSnapshot: listing.priceCents,
      offerAmountCents,
      message: message?.trim() || undefined,
      status: OfferStatus.PENDING,
    },
  });

  return { success: true, offerId: offer.id };
}

export type OfferResponseAction = "ACCEPT" | "COUNTER" | "DECLINE";

export interface RespondToOfferInput {
  offerId: string;
  sellerId: string;
  action: OfferResponseAction;
  counterAmountCents?: number;
}

export async function respondToOffer({
  offerId,
  sellerId,
  action,
  counterAmountCents,
}: RespondToOfferInput): Promise<OfferActionResult> {
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer) {
    return { success: false, error: "Offer not found." };
  }
  if (offer.sellerId !== sellerId) {
    return { success: false, error: "You don't have access to this offer." };
  }
  if (offer.status !== OfferStatus.PENDING) {
    return { success: false, error: "This offer has already been responded to." };
  }

  if (action === "ACCEPT") {
    await db.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.ACCEPTED, respondedAt: new Date() },
    });
    return { success: true, offerId };
  }

  if (action === "DECLINE") {
    await db.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.DECLINED, respondedAt: new Date() },
    });
    return { success: true, offerId };
  }

  // COUNTER
  const minimumOfferCents = computeMinimumOfferCents(offer.listingPriceCentsSnapshot);
  if (
    !counterAmountCents ||
    !Number.isInteger(counterAmountCents) ||
    counterAmountCents < minimumOfferCents ||
    counterAmountCents >= offer.listingPriceCentsSnapshot
  ) {
    return {
      success: false,
      error: `Counter amount must be between R${(minimumOfferCents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })} and the asking price.`,
    };
  }

  await db.offer.update({
    where: { id: offerId },
    data: { status: OfferStatus.COUNTERED, counterAmountCents, respondedAt: new Date() },
  });
  return { success: true, offerId };
}

export type BuyerCounterResponseAction = "ACCEPT" | "DECLINE";

/** Buyer's response to a seller's counter-offer. */
export async function respondToCounterOffer({
  offerId,
  buyerId,
  action,
}: {
  offerId: string;
  buyerId: string;
  action: BuyerCounterResponseAction;
}): Promise<OfferActionResult> {
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer) {
    return { success: false, error: "Offer not found." };
  }
  if (offer.buyerId !== buyerId) {
    return { success: false, error: "You don't have access to this offer." };
  }
  if (offer.status !== OfferStatus.COUNTERED) {
    return { success: false, error: "This offer isn't awaiting your response." };
  }

  await db.offer.update({
    where: { id: offerId },
    data: {
      status: action === "ACCEPT" ? OfferStatus.ACCEPTED : OfferStatus.DECLINED,
      respondedAt: new Date(),
    },
  });
  return { success: true, offerId };
}

/**
 * Looks up an ACCEPTED offer this buyer holds on this listing, if any — used
 * by checkout to charge the negotiated price instead of `listing.priceCents`.
 */
export async function getAcceptedOfferForBuyer(listingId: string, buyerId: string) {
  return db.offer.findFirst({
    where: { listingId, buyerId, status: OfferStatus.ACCEPTED },
    orderBy: { updatedAt: "desc" },
  });
}

/** The effective agreed price for an accepted offer (counter amount takes precedence if one exists). */
export function getAcceptedOfferPriceCents(offer: { offerAmountCents: number; counterAmountCents: number | null }): number {
  return offer.counterAmountCents ?? offer.offerAmountCents;
}

/** A buyer's currently open (PENDING or COUNTERED) offer on a listing, if any — drives PDP "Make an Offer" UI state. */
export async function getOpenOfferForBuyer(listingId: string, buyerId: string) {
  return db.offer.findFirst({
    where: { listingId, buyerId, status: { in: [OfferStatus.PENDING, OfferStatus.COUNTERED] } },
    orderBy: { createdAt: "desc" },
  });
}

/** All offers a seller has received, newest first, with listing + buyer context for the offers dashboard. */
export async function getOffersForSeller(sellerId: string) {
  return db.offer.findMany({
    where: { sellerId },
    include: {
      listing: { select: { id: true, title: true, images: true, priceCents: true, status: true } },
      buyer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function countPendingOffersForSeller(sellerId: string): Promise<number> {
  return db.offer.count({ where: { sellerId, status: OfferStatus.PENDING } });
}
