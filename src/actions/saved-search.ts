"use server";

import { auth } from "@/lib/auth";
import {
  createSavedSearch,
  deleteSavedSearch,
  type SaveSearchResult,
  type SavedSearchInput,
} from "@/lib/saved-searches";
import type { BrowseFilterState } from "@/lib/browse-filters";

async function requireUserId(): Promise<string | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Sign in to save a search." };
    return session.user.id;
  } catch (err) {
    console.error("saved-search: failed to resolve session", err);
    return { success: false, error: "Could not verify your session. Please sign in again." };
  }
}

export async function saveSearchAction(label: string, queryString: string): Promise<SaveSearchResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await createSavedSearch({ userId, queryName: label, label, queryString });
  } catch (err) {
    console.error("saveSearchAction: unexpected error", err);
    return { success: false, error: "Something went wrong while saving this search. Please try again." };
  }
}

export async function saveStructuredSearchAction(
  input: Omit<SavedSearchInput, "userId"> & { filters?: BrowseFilterState },
): Promise<SaveSearchResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await createSavedSearch({ ...input, userId });
  } catch (err) {
    console.error("saveStructuredSearchAction: unexpected error", err);
    return { success: false, error: "Something went wrong while saving this search. Please try again." };
  }
}

export async function deleteSavedSearchAction(id: string) {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await deleteSavedSearch(userId, id);
  } catch (err) {
    console.error("deleteSavedSearchAction: unexpected error", err);
    return { success: false, error: "Could not delete that saved search." };
  }
}
