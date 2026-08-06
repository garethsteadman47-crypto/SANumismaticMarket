"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, SendIcon } from "lucide-react";

import { replyToConversationAction } from "@/actions/messaging";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function InboxReplyForm({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await replyToConversationAction(conversationId, trimmed);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setContent("");
      toast.success("Reply sent.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-slate-800 pt-4">
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Write a reply… Keep contact details and off-platform payments out of this thread."
        rows={3}
        maxLength={2000}
        disabled={isPending}
        className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={!content.trim() || isPending} className="gap-1.5">
          {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          Send reply
        </Button>
      </div>
    </form>
  );
}
