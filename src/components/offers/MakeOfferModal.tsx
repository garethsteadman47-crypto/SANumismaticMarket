"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HandCoinsIcon, Loader2Icon } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOfferAction } from "@/actions/offer";
import { computeMinimumOfferCents, MINIMUM_OFFER_RATIO } from "@/lib/offers";
import { formatZarCents, randsToCents } from "@/lib/utils/currency";

export function MakeOfferModal({ listingId, listingPriceCents, disabled }: { listingId: string; listingPriceCents: number; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [amountRands, setAmountRands] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const minimumOfferCents = useMemo(() => computeMinimumOfferCents(listingPriceCents), [listingPriceCents]);
  const enteredCents = amountRands ? randsToCents(Number(amountRands)) : 0;
  const isBelowMinimum = amountRands !== "" && (!Number.isFinite(enteredCents) || enteredCents < minimumOfferCents);
  const isAboveAsking = amountRands !== "" && enteredCents >= listingPriceCents;
  const canSubmit = amountRands !== "" && !isBelowMinimum && !isAboveAsking && Number.isFinite(enteredCents);

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await createOfferAction(listingId, enteredCents, message || undefined);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Offer sent to the seller.");
      setOpen(false);
      setAmountRands("");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" className="rounded-full" size="lg" disabled={disabled} />}
      >
        <HandCoinsIcon />
        Make an Offer
        <Badge variant="secondary" className="ml-1">
          {MINIMUM_OFFER_RATIO * 100}% min
        </Badge>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make an offer</DialogTitle>
          <DialogDescription>
            Asking price is {formatZarCents(listingPriceCents)}. Offers cannot be lower than{" "}
            {MINIMUM_OFFER_RATIO * 100}% of asking price (minimum allowed: {formatZarCents(minimumOfferCents)}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-amount">Your offer (ZAR)</Label>
            <Input
              id="offer-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder={`e.g. ${(minimumOfferCents / 100).toFixed(2)}`}
              value={amountRands}
              onChange={(event) => setAmountRands(event.target.value)}
              aria-invalid={isBelowMinimum || isAboveAsking}
            />
            {isBelowMinimum && (
              <p className="text-xs text-destructive">
                Offers cannot be lower than {MINIMUM_OFFER_RATIO * 100}% of asking price (Minimum allowed:{" "}
                {formatZarCents(minimumOfferCents)}).
              </p>
            )}
            {isAboveAsking && (
              <p className="text-xs text-destructive">
                Your offer is at or above the asking price — use &quot;Buy Now&quot; instead.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-message">Message to seller (optional)</Label>
            <Textarea
              id="offer-message"
              rows={3}
              placeholder="Let the seller know why this is a fair offer..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" disabled={!canSubmit || isPending} onClick={handleSubmit}>
            {isPending && <Loader2Icon className="animate-spin" />}
            Send offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
