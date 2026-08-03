"use server";

import { auth } from "@/lib/auth";
import { createListing, type CreateListingInput, type CreateListingResult } from "@/lib/listings";

/**
 * Thin "use server" wrapper: resolves the current session, then delegates
 * to the (independently testable, DB-only) `createListing` in
 * `lib/listings.ts`. See that module for the transactional listing +
 * verification + anti-fraud lockout logic.
 */
export async function createListingAction(input: CreateListingInput): Promise<CreateListingResult> {
  let sellerId: string | undefined;
  try {
    const session = await auth();
    sellerId = session?.user?.id;
  } catch (err) {
    console.error("createListingAction: failed to resolve session", err);
    return { success: false, error: "Could not verify your session. Please sign in again." };
  }

  if (!sellerId) {
    return { success: false, error: "You must be signed in to create a listing." };
  }

  try {
    return await createListing(sellerId, input);
  } catch (err) {
    console.error("createListingAction: unexpected error", err);
    return { success: false, error: "Something went wrong while creating your listing. Please try again." };
  }
}
