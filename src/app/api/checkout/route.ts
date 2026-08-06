import { PaymentProvider } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/orders";
import { calculateTransactionFeesFromCents } from "@/lib/commissionCalculator";
import { getAcceptedOfferForBuyer, getAcceptedOfferPriceCents } from "@/lib/offers";
import { jsonError, jsonOk } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  listingId: z.string().min(1),
  offerId: z.string().optional(),
});

const checkoutSchema = previewSchema.extend({
  paymentProvider: z.nativeEnum(PaymentProvider),
});

/**
 * GET /api/checkout?listingId=… — dual-sided fee preview for the signed-in buyer.
 * POST /api/checkout — place the order (same logic as `createOrderAction`).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("You must be signed in to preview checkout fees.", 401);
  }

  const { searchParams } = new URL(request.url);
  const parsed = previewSchema.safeParse({
    listingId: searchParams.get("listingId") ?? "",
    offerId: searchParams.get("offerId") || undefined,
  });
  if (!parsed.success) {
    return jsonError("listingId is required.", 400);
  }

  const listing = await db.listing.findUnique({
    where: { id: parsed.data.listingId },
    include: {
      seller: { select: { subscriptionTier: true } },
      verification: { select: { feeCents: true } },
    },
  });
  if (!listing) {
    return jsonError("Listing not found.", 404);
  }

  const buyer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true },
  });
  if (!buyer) {
    return jsonError("Buyer account not found.", 404);
  }

  let salePriceCents = listing.priceCents;
  if (parsed.data.offerId) {
    const offer = await getAcceptedOfferForBuyer(listing.id, session.user.id);
    if (!offer || offer.id !== parsed.data.offerId) {
      return jsonError("That accepted offer is no longer valid.", 400);
    }
    salePriceCents = getAcceptedOfferPriceCents(offer);
  }

  const fees = calculateTransactionFeesFromCents({
    salePriceCents,
    buyerTier: buyer.subscriptionTier,
    sellerTier: listing.seller.subscriptionTier,
    certFeeCents: listing.verification?.feeCents ?? 0,
  });

  return jsonOk({ fees });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("You must be signed in to complete a purchase.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid checkout payload.", 400);
  }

  const result = await createOrder({
    buyerId: session.user.id,
    listingId: parsed.data.listingId,
    paymentProvider: parsed.data.paymentProvider,
    offerId: parsed.data.offerId,
  });

  if (!result.success) {
    return jsonError(result.error, 400);
  }

  return jsonOk({ orderId: result.orderId });
}
