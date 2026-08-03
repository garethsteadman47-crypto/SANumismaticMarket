"use server";

import { auth } from "@/lib/auth";
import {
  createOffer,
  respondToCounterOffer,
  respondToOffer,
  type BuyerCounterResponseAction,
  type OfferActionResult,
  type OfferResponseAction,
} from "@/lib/offers";

async function requireUserId(): Promise<string | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "You must be signed in." };
    }
    return session.user.id;
  } catch (err) {
    console.error("requireUserId (offer): failed to resolve session", err);
    return { success: false, error: "Could not verify your session. Please sign in again." };
  }
}

export async function createOfferAction(
  listingId: string,
  offerAmountCents: number,
  message?: string
): Promise<OfferActionResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await createOffer({ listingId, buyerId: userId, offerAmountCents, message });
  } catch (err) {
    console.error("createOfferAction failed", err);
    return { success: false, error: "Something went wrong while submitting your offer. Please try again." };
  }
}

export async function respondToOfferAction(
  offerId: string,
  action: OfferResponseAction,
  counterAmountCents?: number
): Promise<OfferActionResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await respondToOffer({ offerId, sellerId: userId, action, counterAmountCents });
  } catch (err) {
    console.error("respondToOfferAction failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function respondToCounterOfferAction(
  offerId: string,
  action: BuyerCounterResponseAction
): Promise<OfferActionResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await respondToCounterOffer({ offerId, buyerId: userId, action });
  } catch (err) {
    console.error("respondToCounterOfferAction failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
