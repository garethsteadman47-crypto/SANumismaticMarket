"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GavelIcon, Loader2Icon } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeBidAction } from "@/actions/auction";
import { formatZarCents, randsToCents } from "@/lib/utils/currency";

export function PlaceBidModal({
  auctionId,
  minimumNextBidCents,
  disabled,
}: {
  auctionId: string;
  minimumNextBidCents: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amountRands, setAmountRands] = useState(() => (minimumNextBidCents / 100).toFixed(2));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const enteredCents = amountRands ? randsToCents(Number(amountRands)) : 0;
  const canSubmit = Number.isFinite(enteredCents) && enteredCents >= minimumNextBidCents;

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await placeBidAction(auctionId, enteredCents);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Bid placed!");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" className="bg-amber-500 text-white hover:bg-amber-600" disabled={disabled} />}>
        <GavelIcon />
        Place Bid
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place your bid</DialogTitle>
          <DialogDescription>Minimum bid: {formatZarCents(minimumNextBidCents)}.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bid-amount">Your bid (ZAR)</Label>
          <Input
            id="bid-amount"
            type="number"
            min="0"
            step="0.01"
            value={amountRands}
            onChange={(event) => setAmountRands(event.target.value)}
            aria-invalid={!canSubmit}
          />
          {!canSubmit && amountRands !== "" && (
            <p className="text-xs text-destructive">Your bid must be at least {formatZarCents(minimumNextBidCents)}.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" disabled={!canSubmit || isPending} onClick={handleSubmit}>
            {isPending && <Loader2Icon className="animate-spin" />}
            Confirm bid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
