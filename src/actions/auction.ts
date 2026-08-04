"use server";

import { auth } from "@/lib/auth";
import { placeBid, type AuctionActionResult } from "@/lib/auctions";

export async function placeBidAction(auctionId: string, amountCents: number): Promise<AuctionActionResult> {
  let bidderId: string | undefined;
  try {
    const session = await auth();
    bidderId = session?.user?.id;
  } catch (err) {
    console.error("placeBidAction: failed to resolve session", err);
    return { success: false, error: "Could not verify your session. Please sign in again." };
  }

  if (!bidderId) {
    return { success: false, error: "You must be signed in to place a bid." };
  }

  try {
    return await placeBid({ auctionId, bidderId, amountCents });
  } catch (err) {
    console.error("placeBidAction: unexpected error", err);
    return { success: false, error: "Something went wrong while placing your bid. Please try again." };
  }
}
