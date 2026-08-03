"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { openDisputeAction } from "@/actions/order";

export function DisputeDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Please describe the issue.");
      return;
    }
    startTransition(async () => {
      const result = await openDisputeAction(orderId, reason);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Dispute opened — escrow funds are on hold until it's resolved.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="destructive" />}>
        <TriangleAlertIcon />
        Flag issue / open dispute
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a dispute</DialogTitle>
          <DialogDescription>
            This locks the escrow hold — funds will not release to the seller until the dispute is resolved.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="disputeReason">What went wrong?</Label>
          <Textarea
            id="disputeReason"
            rows={4}
            placeholder="Describe the issue with this order..."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2Icon className="animate-spin" />}
            Submit dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
