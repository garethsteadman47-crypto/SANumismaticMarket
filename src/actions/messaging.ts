"use server";

import { auth } from "@/lib/auth";
import {
  askListingQuestion,
  replyToConversation,
  type MessagingResult,
} from "@/lib/messaging";

async function requireUserId(): Promise<string | { success: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "You must be signed in to send a message." };
    }
    return session.user.id;
  } catch (err) {
    console.error("requireUserId (messaging): failed to resolve session", err);
    return { success: false, error: "Could not verify your session. Please sign in again." };
  }
}

export async function askListingQuestionAction(
  listingId: string,
  content: string,
): Promise<MessagingResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await askListingQuestion({ listingId, buyerId: userId, content });
  } catch (err) {
    console.error("askListingQuestionAction failed", err);
    return { success: false, error: "Something went wrong while sending your question. Please try again." };
  }
}

export async function replyToConversationAction(
  conversationId: string,
  content: string,
): Promise<MessagingResult> {
  const userId = await requireUserId();
  if (typeof userId !== "string") return userId;

  try {
    return await replyToConversation({ conversationId, senderId: userId, content });
  } catch (err) {
    console.error("replyToConversationAction failed", err);
    return { success: false, error: "Something went wrong while sending your reply. Please try again." };
  }
}
