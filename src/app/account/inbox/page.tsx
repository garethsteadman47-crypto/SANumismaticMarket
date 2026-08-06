import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InboxIcon, ShieldAlertIcon } from "lucide-react";

import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { InboxReplyForm } from "@/components/messaging/InboxReplyForm";
import { ListingImage } from "@/components/ListingImage";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { getConversationForUser, listConversationsForUser } from "@/lib/messaging";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Inbox — ${SITE_NAME}`,
  description: "Secure buyer–seller messaging for MintMark listings.",
};

export const dynamic = "force-dynamic";

export default async function AccountInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/inbox");
  }

  const userId = session.user.id;
  const { c: activeId } = await searchParams;
  const conversations = await listConversationsForUser(userId);
  const active =
    activeId != null
      ? await getConversationForUser(activeId, userId)
      : conversations[0]
        ? await getConversationForUser(conversations[0].id, userId)
        : null;

  const counterpartName = (conversation: NonNullable<typeof active>) => {
    const other = conversation.buyerId === userId ? conversation.seller : conversation.buyer;
    return other.name?.trim() || other.email || "Member";
  };

  return (
    <AccountSubpageShell
      activeHref="/account/inbox"
      icon={InboxIcon}
      title="Inbox"
      description="Stay on-platform when asking about a lot. Never share phone numbers, WhatsApp, or off-escrow payment details."
    >
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
        <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
        <p>
          MintMark Safety Inbox keeps listing questions inside escrow-protected channels. Sharing contact details or
          arranging payment outside the marketplace may void buyer protection.
        </p>
      </div>

      {conversations.length === 0 ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <InboxIcon className="mx-auto size-10 text-slate-600" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-white">No conversations yet</h2>
          <p className="mt-2 text-sm text-slate-400">
            Open any listing and tap <span className="text-slate-200">Ask a Question</span> to message the seller
            securely.
          </p>
          <Link
            href="/listings"
            className="mt-6 inline-flex rounded-md bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/25"
          >
            Browse listings
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <aside className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-2">
            {conversations.map((conversation) => {
              const last = conversation.messages[0];
              const selected = active?.id === conversation.id;
              const unread =
                last != null && last.senderId !== userId && last.isRead === false;
              const other =
                conversation.buyerId === userId ? conversation.seller : conversation.buyer;
              return (
                <Link
                  key={conversation.id}
                  href={`/account/inbox?c=${conversation.id}`}
                  className={cn(
                    "flex gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    selected ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "hover:bg-slate-800/60",
                  )}
                >
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-slate-950 p-1">
                    {conversation.listing?.images[0] ? (
                      <ListingImage
                        src={conversation.listing.images[0]}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="size-full rounded bg-slate-800" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", unread ? "font-semibold text-white" : "text-slate-200")}>
                        {other.name?.trim() || other.email || "Member"}
                      </span>
                      {unread && <span className="size-2 shrink-0 rounded-full bg-amber-400" aria-label="Unread" />}
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {conversation.listing?.title ?? "Listing question"}
                    </p>
                    {last && <p className="mt-0.5 truncate text-xs text-slate-400">{last.content}</p>}
                  </div>
                </Link>
              );
            })}
          </aside>

          <section className="flex min-h-[28rem] flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
            {active ? (
              <>
                <header className="mb-4 flex flex-col gap-1 border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-semibold text-white">{counterpartName(active)}</h2>
                  {active.listing && (
                    <Link
                      href={`/listings/${active.listing.id}`}
                      className="text-sm text-amber-400/90 hover:text-amber-300"
                    >
                      Re: {active.listing.title}
                    </Link>
                  )}
                </header>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                  {active.messages.map((message) => {
                    const mine = message.senderId === userId;
                    return (
                      <div
                        key={message.id}
                        className={cn("flex", mine ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                            mine
                              ? "bg-amber-500/20 text-amber-50"
                              : "bg-slate-800 text-slate-100",
                          )}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="mt-1 text-[0.65rem] text-slate-500">
                            {message.sender.name?.trim() || (mine ? "You" : "Them")} ·{" "}
                            {message.createdAt.toLocaleString("en-ZA", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <InboxReplyForm conversationId={active.id} />
              </>
            ) : (
              <p className="m-auto text-sm text-slate-500">Select a conversation.</p>
            )}
          </section>
        </div>
      )}
    </AccountSubpageShell>
  );
}
