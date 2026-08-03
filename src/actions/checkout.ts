"use server";

import { PaymentProvider } from "@prisma/client";

import { auth } from "@/lib/auth";
import { createOrder, type OrderActionResult } from "@/lib/orders";

/**
 * Thin "use server" wrapper: resolves the buyer's session, then delegates
 * to the transactional `createOrder` in `lib/orders.ts`.
 */
export async function createOrderAction(
  listingId: string,
  paymentProvider: PaymentProvider
): Promise<OrderActionResult> {
  let buyerId: string | undefined;
  try {
    const session = await auth();
    buyerId = session?.user?.id;
  } catch (err) {
    console.error("createOrderAction: failed to resolve session", err);
    return { success: false, error: "Could not verify your session. Please sign in again." };
  }

  if (!buyerId) {
    return { success: false, error: "You must be signed in to complete a purchase." };
  }

  try {
    return await createOrder({ buyerId, listingId, paymentProvider });
  } catch (err) {
    console.error("createOrderAction: unexpected error", err);
    return { success: false, error: "Something went wrong while placing your order. Please try again." };
  }
}
