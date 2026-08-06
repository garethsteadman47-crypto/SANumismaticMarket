"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, MessageCircleQuestionIcon } from "lucide-react";

import { askListingQuestionAction } from "@/actions/messaging";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AskQuestionModal({
  listingId,
  listingTitle,
  sellerName,
  isSignedIn,
  disabled,
}: {
  listingId: string;
  listingTitle: string;
  sellerName?: string | null;
  isSignedIn: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = content.trim().length > 0 && content.trim().length <= 2000;

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await askListingQuestionAction(listingId, content);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Question sent. Replies appear in your Inbox.");
      setOpen(false);
      setContent("");
      router.push(`/account/inbox?c=${result.conversationId}`);
      router.refresh();
    });
  }

  if (!isSignedIn) {
    return (
      <Link
        href={`/login?callbackUrl=/listings/${listingId}`}
        className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full" })}
      >
        <MessageCircleQuestionIcon />
        Ask a Question
      </Link>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="rounded-full" size="lg" disabled={disabled} />
        }
      >
        <MessageCircleQuestionIcon />
        Ask a Question
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ask the seller</DialogTitle>
          <DialogDescription>
            Message {sellerName?.trim() || "the seller"} about &ldquo;{listingTitle}&rdquo;. Stay on-platform —
            never share phone numbers, WhatsApp, or payment details outside MintMark escrow.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ask-question-content">Your question</Label>
          <Textarea
            id="ask-question-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Ask about condition, provenance, shipping, or grading…"
            rows={5}
            maxLength={2000}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">{content.trim().length}/2000</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Send question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
