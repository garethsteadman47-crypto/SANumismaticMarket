"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";

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
import { respondToOfferAction } from "@/actions/offer";
import { computeMinimumOfferCents } from "@/lib/offers";
import { formatZarCents, randsToCents } from "@/lib/utils/currency";

export function OfferRespondControls({
  offerId,
  listingPriceCents,
}: {
  offerId: string;
  listingPriceCents: number;
}) {
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterRands, setCounterRands] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const minimumOfferCents = computeMinimumOfferCents(listingPriceCents);

  function respond(action: "ACCEPT" | "DECLINE") {
    startTransition(async () => {
      const result = await respondToOfferAction(offerId, action);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(action === "ACCEPT" ? "Offer accepted." : "Offer declined.");
      router.refresh();
    });
  }

  function submitCounter() {
    const counterAmountCents = randsToCents(Number(counterRands));
    startTransition(async () => {
      const result = await respondToOfferAction(offerId, "COUNTER", counterAmountCents);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Counter-offer sent to the buyer.");
      setCounterOpen(false);
      setCounterRands("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" disabled={isPending} onClick={() => respond("ACCEPT")}>
        {isPending && <Loader2Icon className="animate-spin" />}
        <CheckIcon />
        Accept
      </Button>

      <Dialog open={counterOpen} onOpenChange={setCounterOpen}>
        <DialogTrigger render={<Button type="button" size="sm" variant="outline" disabled={isPending} />}>
          Counter
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a counter-offer</DialogTitle>
            <DialogDescription>
              Must be between {formatZarCents(minimumOfferCents)} and the asking price of{" "}
              {formatZarCents(listingPriceCents)}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="counter-amount">Counter amount (ZAR)</Label>
            <Input
              id="counter-amount"
              type="number"
              min="0"
              step="0.01"
              value={counterRands}
              onChange={(event) => setCounterRands(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" disabled={isPending || !counterRands} onClick={submitCounter}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Send counter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={() => respond("DECLINE")}>
        <XIcon />
        Decline
      </Button>
    </div>
  );
}
