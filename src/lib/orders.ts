import { Prisma, ListingStatus, OfferStatus, OrderStatus, PaymentProvider } from "@prisma/client";

import { db } from "@/lib/db";
import { calculateTransactionFeesFromCents } from "@/lib/commissionCalculator";
import { calculateVat } from "@/lib/utils/fees";
import { canTransitionToSettled, computeSettlementSchedule } from "@/lib/utils/escrow";
import { buildOrderInvoices } from "@/lib/utils/invoicing";
import { generateOtpCode, isOtpFormatValid, MAX_OTP_ATTEMPTS, OTP_EXPIRY_MS } from "@/lib/otp";
import { getAcceptedOfferPriceCents } from "@/lib/offers";
import { getAvailablePaymentProviders } from "@/lib/payments";
import { getShippingCarrier } from "@/lib/shipping";

/**
 * Core order/escrow business logic, deliberately kept out of the
 * `"use server"` action modules (`actions/checkout.ts`, `actions/order.ts`)
 * so it can be exercised directly in integration tests without a live
 * Next.js request/auth context — mirrors the `lib/listings.ts` pattern.
 */

export type OrderActionResult<T = { orderId: string }> =
  | ({ success: true } & T)
  | { success: false; error: string };

// ── Checkout: create the order and enter escrow ─────────────────────────

export interface CreateOrderInput {
  buyerId: string;
  listingId: string;
  paymentProvider: PaymentProvider;
  /** An ACCEPTED offer belonging to this buyer+listing — charges the negotiated price instead of `listing.priceCents`. */
  offerId?: string;
}

export async function createOrder({
  buyerId,
  listingId,
  paymentProvider,
  offerId,
}: CreateOrderInput): Promise<OrderActionResult> {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { id: true, subscriptionTier: true } } },
  });
  if (!listing) {
    return { success: false, error: "This listing no longer exists." };
  }
  if (listing.status !== ListingStatus.ACTIVE) {
    return { success: false, error: "This listing is no longer available for purchase." };
  }
  if (listing.sellerId === buyerId) {
    return { success: false, error: "You can't purchase your own listing." };
  }

  // If an accepted offer is supplied, verify it belongs to this exact
  // buyer + listing and is still ACCEPTED before trusting its price —
  // never trust a client-supplied override amount directly.
  let effectivePriceCents = listing.priceCents;
  if (offerId) {
    const offer = await db.offer.findUnique({ where: { id: offerId } });
    if (
      !offer ||
      offer.listingId !== listingId ||
      offer.buyerId !== buyerId ||
      offer.status !== OfferStatus.ACCEPTED
    ) {
      return { success: false, error: "That accepted offer is no longer valid." };
    }
    effectivePriceCents = getAcceptedOfferPriceCents(offer);
  }

  if (!getAvailablePaymentProviders(effectivePriceCents).includes(paymentProvider)) {
    return { success: false, error: "That payment method isn't available for this order value." };
  }

  const verification = await db.verification.findUnique({
    where: { listingId },
    select: { feeCents: true },
  });

  const buyer = await db.user.findUnique({
    where: { id: buyerId },
    select: { subscriptionTier: true },
  });
  if (!buyer) {
    return { success: false, error: "Buyer account not found." };
  }

  const fees = calculateTransactionFeesFromCents({
    salePriceCents: effectivePriceCents,
    buyerTier: buyer.subscriptionTier,
    sellerTier: listing.seller.subscriptionTier,
    certFeeCents: verification?.feeCents ?? 0,
  });

  // SARS output VAT remains on the platform's fee revenue (seller commission + cert).
  const platformVatCents = calculateVat(fees.sellerFeeCents + fees.certFeeCents);

  const now = new Date();
  const otpCode = generateOtpCode();
  const courierName = getShippingCarrier(effectivePriceCents).name;

  try {
    const order = await db.$transaction(async (tx) => {
      // Atomic, race-safe "claim" of the listing: this only succeeds if the
      // listing is still ACTIVE at the moment of the write, so two buyers
      // racing to check out the same listing can't both succeed.
      const claim = await tx.listing.updateMany({
        where: { id: listingId, status: ListingStatus.ACTIVE },
        data: { status: ListingStatus.PENDING_SALE },
      });
      if (claim.count === 0) {
        throw new Error("LISTING_NOT_AVAILABLE");
      }

      return tx.order.create({
        data: {
          listingId,
          buyerId,
          sellerId: listing.sellerId,
          status: OrderStatus.PAID_ESCROW,
          itemPriceCents: fees.salePriceCents,
          // Legacy single-sided fields mirror the seller commission snapshot.
          commissionRateBps: fees.sellerCommissionRateBps,
          commissionAmountCents: fees.sellerFeeCents,
          buyerCommissionRate: fees.buyerCommissionRate,
          buyerCommissionZAR: fees.buyerFeeZAR,
          sellerCommissionRate: fees.sellerCommissionRate,
          sellerCommissionZAR: fees.sellerFeeZAR,
          totalShippingCost: fees.totalShippingCost,
          buyerShippingShare: fees.buyerShippingShare,
          sellerShippingShare: fees.sellerShippingShare,
          buyerPayableZAR: fees.totalBuyerPayable,
          verificationFeeCents: fees.certFeeCents,
          adBoostFeeCents: 0,
          platformVatCents,
          sellerPayoutCents: fees.netSellerPayoutCents - platformVatCents,
          paymentProvider,
          paidAt: now,
          courierName,
          deliveryOtp: {
            code: otpCode,
            generatedAt: now,
            expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
            attemptCount: 0,
          },
        },
      });
    });

    return { success: true, orderId: order.id };
  } catch (err) {
    if (err instanceof Error && err.message === "LISTING_NOT_AVAILABLE") {
      return { success: false, error: "This listing was just purchased by someone else." };
    }
    console.error("createOrder failed", err);
    return { success: false, error: "Something went wrong while placing your order. Please try again." };
  }
}

// ── Seller logistics: ship the item ──────────────────────────────────────

export interface MarkInTransitInput {
  orderId: string;
  sellerId: string;
  trackingNumber: string;
  packingVideoUrl?: string;
}

export async function markOrderInTransit({
  orderId,
  sellerId,
  trackingNumber,
  packingVideoUrl,
}: MarkInTransitInput): Promise<OrderActionResult> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "Order not found." };
  if (order.sellerId !== sellerId) return { success: false, error: "Only the seller can ship this order." };
  if (order.status !== OrderStatus.PAID_ESCROW) {
    return { success: false, error: "This order isn't awaiting shipment." };
  }
  if (!trackingNumber.trim()) {
    return { success: false, error: "A tracking number is required." };
  }

  const now = new Date();
  await db.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.IN_TRANSIT,
      trackingNumber: trackingNumber.trim(),
      ...(packingVideoUrl
        ? {
            unboxingEvidence: {
              upsert: {
                set: { sellerPackingVideoUrl: packingVideoUrl, sellerPackingVideoUploadedAt: now },
                update: { sellerPackingVideoUrl: packingVideoUrl, sellerPackingVideoUploadedAt: now },
              },
            },
          }
        : {}),
    },
  });

  return { success: true, orderId };
}

// ── Delivery OTP verification & payout velocity execution ───────────────

export interface VerifyDeliveryOtpInput {
  orderId: string;
  actingUserId: string;
  submittedCode: string;
}

export type VerifyDeliveryOtpResult = OrderActionResult<{ orderId: string; settled: boolean }>;

export async function verifyDeliveryOtp({
  orderId,
  actingUserId,
  submittedCode,
}: VerifyDeliveryOtpInput): Promise<VerifyDeliveryOtpResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { seller: { select: { subscriptionTier: true } } },
  });
  if (!order) return { success: false, error: "Order not found." };
  if (order.buyerId !== actingUserId && order.sellerId !== actingUserId) {
    return { success: false, error: "You don't have access to this order." };
  }
  if (order.status !== OrderStatus.IN_TRANSIT) {
    return { success: false, error: "This order isn't awaiting a delivery confirmation." };
  }
  if (!isOtpFormatValid(submittedCode)) {
    return { success: false, error: "Enter the 6-digit delivery code." };
  }

  const otp = order.deliveryOtp;
  if (!otp) {
    return { success: false, error: "No delivery code was generated for this order." };
  }
  if (otp.attemptCount >= MAX_OTP_ATTEMPTS) {
    return { success: false, error: "Too many incorrect attempts. Please contact support." };
  }
  if (new Date() > otp.expiresAt) {
    return { success: false, error: "This delivery code has expired. Please contact support." };
  }

  if (otp.code !== submittedCode.trim()) {
    await db.order.update({
      where: { id: orderId },
      data: { deliveryOtp: { upsert: { set: otp, update: { attemptCount: otp.attemptCount + 1 } } } },
    });
    const remaining = MAX_OTP_ATTEMPTS - (otp.attemptCount + 1);
    return {
      success: false,
      error: remaining > 0 ? `Incorrect code. ${remaining} attempt(s) remaining.` : "Incorrect code. No attempts remaining.",
    };
  }

  const now = new Date();
  const schedule = computeSettlementSchedule(now, order.seller.subscriptionTier);
  const isInstantSettle = schedule.nextStatus === OrderStatus.SETTLED;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: schedule.nextStatus,
        deliveredAt: now,
        deliveryOtp: { upsert: { set: otp, update: { verifiedAt: now } } },
        payoutVelocity: schedule.payoutVelocity,
        escrowHoldReleaseAt: schedule.escrowHoldReleaseAt,
        settledAt: schedule.settledAt,
      },
    });

    if (isInstantSettle) {
      await finalizeSettlement(tx, orderId);
    }
  });

  return { success: true, orderId, settled: isInstantSettle };
}

// ── Escrow hold release (simulated scheduled job) ────────────────────────

export async function settleExpiredHold(orderId: string): Promise<OrderActionResult> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "Order not found." };
  if (!canTransitionToSettled({ status: order.status, escrowHoldReleaseAt: order.escrowHoldReleaseAt })) {
    return { success: false, error: "This order isn't eligible to be settled yet." };
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.SETTLED, settledAt: new Date() } });
    await finalizeSettlement(tx, orderId);
  });

  return { success: true, orderId };
}

/**
 * Finds every `HOLD_48H` order whose hold has expired (and isn't disputed)
 * and settles it. Backs both the manual "Settle now" demo button and the
 * `/api/v1/cron/settle` route (for a real scheduler, e.g. Vercel Cron).
 */
export async function settleAllExpiredHolds(): Promise<{ settledOrderIds: string[] }> {
  const dueOrders = await db.order.findMany({
    where: { status: OrderStatus.HOLD_48H, escrowHoldReleaseAt: { lte: new Date() } },
    select: { id: true },
  });

  const settledOrderIds: string[] = [];
  for (const { id } of dueOrders) {
    const result = await settleExpiredHold(id);
    if (result.success) settledOrderIds.push(id);
  }
  return { settledOrderIds };
}

/**
 * Marks the listing SOLD, releases its `CertificateLock` (freeing the
 * certificate for a legitimate future resale — see the Step 1 schema
 * notes on `CertificateLock`), and generates the dual settlement invoices.
 * Must be called from within the same transaction that flips the order to
 * `SETTLED`.
 */
async function finalizeSettlement(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      listing: { select: { id: true, title: true } },
    },
  });

  await tx.listing.update({ where: { id: order.listingId }, data: { status: ListingStatus.SOLD } });
  await tx.certificateLock.deleteMany({ where: { listingId: order.listingId } });

  const [sellerToBuyer, platformToSeller] = buildOrderInvoices({
    itemPriceCents: order.itemPriceCents,
    currency: order.currency,
    commissionRateBps: order.commissionRateBps,
    commissionAmountCents: order.commissionAmountCents,
    verificationFeeCents: order.verificationFeeCents,
    adBoostFeeCents: order.adBoostFeeCents,
    platformVatCents: order.platformVatCents,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    listingTitle: order.listing.title,
  });

  await tx.invoice.createMany({
    data: [
      { orderId, ...sellerToBuyer },
      { orderId, ...platformToSeller },
    ],
  });
}

// ── Dispute ────────────────────────────────────────────────────────────

export async function openDispute(
  orderId: string,
  actingUserId: string,
  reason: string
): Promise<OrderActionResult> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "Order not found." };
  if (order.buyerId !== actingUserId && order.sellerId !== actingUserId) {
    return { success: false, error: "You don't have access to this order." };
  }
  if (order.status !== OrderStatus.HOLD_48H) {
    return { success: false, error: "A dispute can only be raised during the 48-hour escrow hold." };
  }
  if (!reason.trim()) {
    return { success: false, error: "Please describe the issue." };
  }

  await db.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.DISPUTE, disputeReason: reason.trim(), disputeOpenedAt: new Date() },
  });

  return { success: true, orderId };
}

// ── Buyer unboxing video ─────────────────────────────────────────────────

const UNBOXING_ELIGIBLE_STATUSES: OrderStatus[] = [OrderStatus.HOLD_48H, OrderStatus.DISPUTE, OrderStatus.SETTLED];

export async function uploadUnboxingVideo(
  orderId: string,
  buyerId: string,
  videoUrl: string
): Promise<OrderActionResult> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "Order not found." };
  if (order.buyerId !== buyerId) return { success: false, error: "Only the buyer can upload an unboxing video." };
  if (!UNBOXING_ELIGIBLE_STATUSES.includes(order.status)) {
    return { success: false, error: "You can upload your unboxing video once delivery has been confirmed." };
  }

  const now = new Date();
  await db.order.update({
    where: { id: orderId },
    data: {
      unboxingEvidence: {
        upsert: {
          set: { buyerUnboxingVideoUrl: videoUrl, buyerUnboxingVideoUploadedAt: now },
          update: { buyerUnboxingVideoUrl: videoUrl, buyerUnboxingVideoUploadedAt: now },
        },
      },
    },
  });

  return { success: true, orderId };
}

// ── Access control helper for the order page ────────────────────────────

export async function getOrderForViewer(orderId: string, viewerId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      listing: true,
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true, subscriptionTier: true } },
      invoices: true,
    },
  });
  if (!order) return null;
  if (order.buyerId !== viewerId && order.sellerId !== viewerId) return null;
  return order;
}
