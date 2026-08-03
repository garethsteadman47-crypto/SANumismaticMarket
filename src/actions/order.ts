"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  markOrderInTransit,
  openDispute,
  settleExpiredHold,
  uploadUnboxingVideo,
  verifyDeliveryOtp,
  type OrderActionResult,
  type VerifyDeliveryOtpResult,
} from "@/lib/orders";

async function requireUserId(): Promise<string | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "You must be signed in." };
    }
    return session.user.id;
  } catch (err) {
    console.error("requireUserId: failed to resolve session", err);
    return { success: false, error: "Could not verify your session. Please sign in again." };
  }
}

export async function markInTransitAction(
  orderId: string,
  trackingNumber: string,
  packingVideoUrl?: string
): Promise<OrderActionResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await markOrderInTransit({ orderId, sellerId: userId, trackingNumber, packingVideoUrl });
  } catch (err) {
    console.error("markInTransitAction failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function verifyDeliveryOtpAction(orderId: string, code: string): Promise<VerifyDeliveryOtpResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await verifyDeliveryOtp({ orderId, actingUserId: userId, submittedCode: code });
  } catch (err) {
    console.error("verifyDeliveryOtpAction failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Manual "Settle now" demo trigger — represents the scheduled job that
 * `/api/cron/settle-holds` also runs. Restricted to the order's own buyer
 * or seller so it can't be used to prod arbitrary orders.
 */
export async function settleNowAction(orderId: string): Promise<OrderActionResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  const order = await db.order.findUnique({ where: { id: orderId }, select: { buyerId: true, sellerId: true } });
  if (!order) return { success: false, error: "Order not found." };
  if (order.buyerId !== userId && order.sellerId !== userId) {
    return { success: false, error: "You don't have access to this order." };
  }

  try {
    return await settleExpiredHold(orderId);
  } catch (err) {
    console.error("settleNowAction failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function openDisputeAction(orderId: string, reason: string): Promise<OrderActionResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await openDispute(orderId, userId, reason);
  } catch (err) {
    console.error("openDisputeAction failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function uploadUnboxingVideoAction(orderId: string, videoUrl: string): Promise<OrderActionResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await uploadUnboxingVideo(orderId, userId, videoUrl);
  } catch (err) {
    console.error("uploadUnboxingVideoAction failed", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
