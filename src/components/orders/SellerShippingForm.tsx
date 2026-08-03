"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, TruckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markInTransitAction } from "@/actions/order";

export function SellerShippingForm({ orderId, courierName }: { orderId: string; courierName: string | null }) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [packingVideoUrl, setPackingVideoUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    if (!trackingNumber.trim()) {
      toast.error("Enter a tracking number first.");
      return;
    }
    startTransition(async () => {
      const result = await markInTransitAction(orderId, trackingNumber, packingVideoUrl || undefined);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked as shipped — the buyer's delivery code is now active.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <TruckIcon className="size-4" />
          Ship this order
        </CardTitle>
        <CardDescription>
          {courierName ? `Recommended carrier: ${courierName}. ` : ""}Enter the tracking number once you&apos;ve
          handed the package to the courier. A packing video helps resolve any delivery disputes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="trackingNumber">Tracking number</Label>
          <Input
            id="trackingNumber"
            placeholder="e.g. RV-4821093"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="packingVideoUrl">Packing video URL (optional)</Label>
          <Input
            id="packingVideoUrl"
            placeholder="https://example.com/packing-video.mp4"
            value={packingVideoUrl}
            onChange={(event) => setPackingVideoUrl(event.target.value)}
          />
        </div>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2Icon className="animate-spin" />}
          Mark as shipped
        </Button>
      </CardContent>
    </Card>
  );
}
