"use server";

import { auth } from "@/lib/auth";
import { createSavedSearch, type SaveSearchResult } from "@/lib/saved-searches";

export async function saveSearchAction(label: string, queryString: string): Promise<SaveSearchResult> {
  let userId: string | undefined;
  try {
    const session = await auth();
    userId = session?.user?.id;
  } catch (err) {
    console.error("saveSearchAction: failed to resolve session", err);
    return { success: false, error: "Could not verify your session. Please sign in again." };
  }

  if (!userId) {
    return { success: false, error: "Sign in to save a search." };
  }

  try {
    return await createSavedSearch({ userId, label, queryString });
  } catch (err) {
    console.error("saveSearchAction: unexpected error", err);
    return { success: false, error: "Something went wrong while saving this search. Please try again." };
  }
}
