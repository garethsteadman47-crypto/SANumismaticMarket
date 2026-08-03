import { z } from "zod";

import { getOrderForViewer, verifyDeliveryOtp } from "@/lib/orders";
import { OTP_LENGTH } from "@/lib/otp";
import { OBJECT_ID_PATTERN, jsonError, jsonOk, isNextResponse } from "@/lib/api/http";
import { requireApiUser } from "@/lib/api/require-user";

export const dynamic = "force-dynamic";

const otpBodySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Delivery code must be ${OTP_LENGTH} digits.`),
});

/**
 * GET /api/v1/orders/:id/otp — return the delivery OTP for buyer/seller.
 * Used by a future courier/mobile screen mirroring the web order page.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (isNextResponse(user)) return user;

  const { id } = await context.params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    return jsonError("Invalid order id.", 400);
  }

  try {
    const order = await getOrderForViewer(id, user.id);
    if (!order) {
      return jsonError("Order not found.", 404);
    }
    if (!order.deliveryOtp) {
      return jsonError("No delivery code is available for this order.", 404);
    }

    return jsonOk({
      orderId: order.id,
      status: order.status,
      code: order.deliveryOtp.code,
      expiresAt: order.deliveryOtp.expiresAt,
      verifiedAt: order.deliveryOtp.verifiedAt,
      attemptCount: order.deliveryOtp.attemptCount,
    });
  } catch (err) {
    console.error("GET /api/v1/orders/[id]/otp failed", err);
    return jsonError("Failed to load delivery code.", 500);
  }
}

/**
 * POST /api/v1/orders/:id/otp — confirm delivery (escrow state transition).
 * Body: `{ "code": "123456" }`
 * Same logic as `verifyDeliveryOtpAction`.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (isNextResponse(user)) return user;

  const { id } = await context.params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    return jsonError("Invalid order id.", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be JSON.", 400);
  }

  const parsed = otpBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(first?.message ?? "Invalid OTP payload.", 422, {
      field: first?.path.join("."),
    });
  }

  try {
    const result = await verifyDeliveryOtp({
      orderId: id,
      actingUserId: user.id,
      submittedCode: parsed.data.code,
    });
    if (!result.success) {
      return jsonError(result.error, 400);
    }
    return jsonOk(result);
  } catch (err) {
    console.error("POST /api/v1/orders/[id]/otp failed", err);
    return jsonError("Something went wrong while confirming delivery.", 500);
  }
}
