"use server";

import { auth } from "@/lib/auth";
import { toggleWishlist, listWishlist } from "@/lib/wishlist";
import { createWantedItem, listWantedItems, type CreateWantedItemInput } from "@/lib/wanted";

export async function toggleWishlistAction(listingId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false as const, error: "Sign in to save items to your wishlist." };
  }
  return toggleWishlist(session.user.id, listingId);
}

export async function getMyWishlistAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "Sign in required." };
  const items = await listWishlist(session.user.id);
  return { success: true as const, items };
}

export async function createWantedItemAction(input: CreateWantedItemInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false as const, error: "Sign in to create a wanted request." };
  }
  return createWantedItem(session.user.id, input);
}

export async function getMyWantedItemsAction() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: "Sign in required." };
  const items = await listWantedItems(session.user.id);
  return { success: true as const, items };
}
