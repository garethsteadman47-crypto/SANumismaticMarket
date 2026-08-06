import { db } from "@/lib/db";

const MAX_MESSAGE_LENGTH = 2000;

export type MessagingResult =
  | { success: true; conversationId: string; messageId: string }
  | { success: false; error: string };

function normalizeContent(raw: string): string | { error: string } {
  const content = raw.trim();
  if (!content) return { error: "Please enter a message." };
  if (content.length > MAX_MESSAGE_LENGTH) {
    return { error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` };
  }
  return content;
}

/** Start or continue a listing-scoped buyer→seller conversation. */
export async function askListingQuestion(params: {
  listingId: string;
  buyerId: string;
  content: string;
}): Promise<MessagingResult> {
  const content = normalizeContent(params.content);
  if (typeof content !== "string") return { success: false, error: content.error };

  const listing = await db.listing.findUnique({
    where: { id: params.listingId },
    select: { id: true, sellerId: true, status: true, title: true },
  });
  if (!listing) return { success: false, error: "Listing not found." };
  if (listing.sellerId === params.buyerId) {
    return { success: false, error: "You cannot message yourself about your own listing." };
  }

  let conversation = await db.conversation.findFirst({
    where: {
      listingId: listing.id,
      buyerId: params.buyerId,
      sellerId: listing.sellerId,
    },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        listingId: listing.id,
        buyerId: params.buyerId,
        sellerId: listing.sellerId,
      },
    });
  }

  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      senderId: params.buyerId,
      content,
    },
  });

  await db.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return { success: true, conversationId: conversation.id, messageId: message.id };
}

export async function replyToConversation(params: {
  conversationId: string;
  senderId: string;
  content: string;
}): Promise<MessagingResult> {
  const content = normalizeContent(params.content);
  if (typeof content !== "string") return { success: false, error: content.error };

  const conversation = await db.conversation.findUnique({
    where: { id: params.conversationId },
    select: { id: true, buyerId: true, sellerId: true },
  });
  if (!conversation) return { success: false, error: "Conversation not found." };
  if (params.senderId !== conversation.buyerId && params.senderId !== conversation.sellerId) {
    return { success: false, error: "You are not a participant in this conversation." };
  }

  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      senderId: params.senderId,
      content,
    },
  });

  // Mark the other party's prior unread messages as read when you reply.
  await db.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: { not: params.senderId },
      isRead: false,
    },
    data: { isRead: true },
  });

  await db.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return { success: true, conversationId: conversation.id, messageId: message.id };
}

export async function listConversationsForUser(userId: string) {
  return db.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: { select: { id: true, title: true, images: true, slug: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, createdAt: true, senderId: true, isRead: true },
      },
    },
  });
}

export async function getConversationForUser(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      listing: { select: { id: true, title: true, images: true, slug: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });
  if (!conversation) return null;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;

  await db.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  return conversation;
}

export async function countUnreadMessagesForUser(userId: string): Promise<number> {
  return db.message.count({
    where: {
      isRead: false,
      senderId: { not: userId },
      conversation: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    },
  });
}
