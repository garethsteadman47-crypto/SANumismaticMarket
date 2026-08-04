"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import type { OfferStatus } from "@prisma/client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { respondToCounterOfferAction } from "@/actions/offer";
import { formatZarCents } from "@/lib/utils/currency";

export function OfferStatusAlert({
  offerId,
  status,
  offerAmountCents,
  counterAmountCents,
}: {
  offerId: string;
  status: OfferStatus;
  offerAmountCents: number;
  counterAmountCents: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function respond(action: "ACCEPT" | "DECLINE") {
    startTransition(async () => {
      const result = await respondToCounterOfferAction(offerId, action);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(action === "ACCEPT" ? "Counter-offer accepted — you can now check out at this price." : "Counter-offer declined.");
      router.refresh();
    });
  }

  if (status === "PENDING") {
    return (
      <Alert>
        <AlertTitle>Offer sent — awaiting seller response</AlertTitle>
        <AlertDescription>You offered {formatZarCents(offerAmountCents)}. We&apos;ll notify you here once the seller responds.</AlertDescription>
      </Alert>
    );
  }

  if (status === "COUNTERED" && counterAmountCents != null) {
    return (
      <Alert>
        <AlertTitle>Seller countered at {formatZarCents(counterAmountCents)}</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>Your original offer was {formatZarCents(offerAmountCents)}.</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isPending} onClick={() => respond("ACCEPT")}>
              {isPending && <Loader2Icon className="animate-spin" />}
              Accept counter
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => respond("DECLINE")}>
              Decline
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
