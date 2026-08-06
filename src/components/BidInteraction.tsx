"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GavelIcon, Loader2Icon, ShieldIcon } from "lucide-react";

import { placeBidAction } from "@/actions/auction";
import { AuctionCountdown } from "@/components/auctions/AuctionCountdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getQuickBidCents } from "@/lib/auctions";
import { formatZarCents, randsToCents } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

/**
 * Frictionless auction bidding panel with proxy / max bidding:
 * SA quick-increment buttons set a max equal to the tapped amount;
 * the custom field is the bidder's confidential ceiling.
 */
export function BidInteraction({
  auctionId,
  currentBidCents,
  hasBids,
  minimumNextBidCents,
  bidIncrementCents,
  endsAtIso,
  phaseLabel,
  disabled,
  leadingBidderName,
  hasReserve,
  isReserveMet,
  saleOutcome,
}: {
  auctionId: string;
  currentBidCents: number;
  hasBids: boolean;
  minimumNextBidCents: number;
  bidIncrementCents: number;
  endsAtIso: string;
  phaseLabel: "Ends in" | "Starts in" | "Ended";
  disabled?: boolean;
  leadingBidderName?: string | null;
  hasReserve?: boolean;
  isReserveMet?: boolean;
  saleOutcome?: "WINNER" | "RESERVE_NOT_MET" | "NO_BIDS" | "LIVE" | "CANCELLED";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customRands, setCustomRands] = useState(() => (minimumNextBidCents / 100).toFixed(2));
  const [confirmCents, setConfirmCents] = useState<number | null>(null);

  const quickBids = useMemo(
    () => getQuickBidCents(minimumNextBidCents, bidIncrementCents),
    [minimumNextBidCents, bidIncrementCents],
  );

  const customCents = customRands ? randsToCents(Number(customRands)) : 0;
  const customValid = Number.isFinite(customCents) && customCents >= minimumNextBidCents;

  function openConfirm(amountCents: number) {
    if (disabled || amountCents < minimumNextBidCents) return;
    setConfirmCents(amountCents);
  }

  function handleConfirm() {
    if (confirmCents == null || confirmCents < minimumNextBidCents) return;
    startTransition(async () => {
      const result = await placeBidAction(auctionId, confirmCents);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.outbid) {
        toast.message("Your max was outbid by another bidder's proxy ceiling.");
      } else {
        toast.success("Max bid placed — you're leading (proxy bidding active).");
      }
      setConfirmCents(null);
      setCustomRands((((result.currentBidCents ?? confirmCents) + bidIncrementCents) / 100).toFixed(2));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-white shadow-lg shadow-black/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-[0.16em] text-amber-400 uppercase">
              {hasBids ? "Current Bid" : "Starting Bid"}
            </span>
            <p className="font-heading text-4xl font-bold tracking-tight text-white tabular-nums">
              {formatZarCents(currentBidCents)}
            </p>
            {leadingBidderName && (
              <span className="text-xs text-slate-300">Leading: {leadingBidderName}</span>
            )}
            {hasReserve && (
              <span
                className={cn(
                  "mt-1 w-fit rounded px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase",
                  isReserveMet ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300",
                )}
              >
                {isReserveMet ? "Reserve met" : "Reserve not met"}
              </span>
            )}
            {saleOutcome === "RESERVE_NOT_MET" && (
              <span className="text-sm text-amber-300">Auction ended — reserve price was not met.</span>
            )}
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <span className="text-xs font-semibold tracking-[0.16em] text-slate-300 uppercase">
              Time Remaining
            </span>
            {phaseLabel === "Ended" ? (
              <span className="text-lg font-semibold text-slate-300">Auction ended</span>
            ) : (
              <AuctionCountdown
                targetIso={endsAtIso}
                label={phaseLabel === "Starts in" ? "Starts in:" : "Ending in:"}
                prominent
                onDark
                className="text-lg sm:text-xl"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick max bid</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {quickBids.map((amountCents) => (
            <Button
              key={amountCents}
              type="button"
              variant="outline"
              disabled={disabled || isPending}
              onClick={() => openConfirm(amountCents)}
              className="h-11 border-slate-700 font-semibold hover:border-amber-500 hover:bg-amber-500/10"
            >
              Max {formatZarCents(amountCents)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="custom-bid" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Your maximum bid (ZAR) — proxy bidding
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="custom-bid"
            type="number"
            min={minimumNextBidCents / 100}
            step="0.01"
            value={customRands}
            disabled={disabled || isPending}
            onChange={(event) => setCustomRands(event.target.value)}
            aria-invalid={customRands !== "" && !customValid}
            className="h-12 text-base"
          />
          <Button
            type="button"
            disabled={disabled || isPending || !customValid}
            onClick={() => openConfirm(customCents)}
            className={cn(
              "h-12 min-w-[10rem] bg-amber-500 px-6 text-base font-bold text-black hover:bg-amber-400",
              "shadow-md shadow-amber-500/20",
            )}
          >
            <GavelIcon className="size-4" aria-hidden />
            Set Max Bid
          </Button>
        </div>
        {!customValid && customRands !== "" && (
          <p className="text-xs text-destructive">
            Your maximum must be at least {formatZarCents(minimumNextBidCents)} (current high + minimum increment).
          </p>
        )}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldIcon className="size-3.5 text-emerald-600" aria-hidden />
          We&apos;ll bid up to your max in {formatZarCents(bidIncrementCents)} steps — your ceiling stays private.
        </p>
      </div>

      <Dialog open={confirmCents != null} onOpenChange={(open) => !open && setConfirmCents(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your maximum bid</DialogTitle>
            <DialogDescription>
              {confirmCents != null
                ? `Set a confidential max of ${formatZarCents(confirmCents)}? Proxy bidding will raise the visible bid only as far as needed to keep you ahead. This is a legally binding commitment up to that amount.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirmCents(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleConfirm}
              className="bg-amber-500 font-bold text-black hover:bg-amber-400"
            >
              {isPending && <Loader2Icon className="animate-spin" aria-hidden />}
              Confirm max bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
