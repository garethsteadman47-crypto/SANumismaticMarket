"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, ScanLineIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OTP_LENGTH } from "@/lib/otp";
import { verifyDeliveryOtpAction } from "@/actions/order";

/**
 * Simulates the courier "scanning" the buyer's delivery OTP. In a real
 * deployment this would be a courier-facing device/app; here, whoever has
 * the code (buyer or seller, both of whom can view this order) enters it
 * to confirm delivery.
 */
export function DeliveryOtpVerifyForm({ orderId }: { orderId: string }) {
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    startTransition(async () => {
      const result = await verifyDeliveryOtpAction(orderId, code);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.settled
          ? "Delivery confirmed — funds settled instantly (Gold Dealer)."
          : "Delivery confirmed — funds will settle after a 48-hour hold."
      );
      setCode("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <ScanLineIcon className="size-4" />
          Confirm delivery
        </CardTitle>
        <CardDescription>Courier: enter the 6-digit delivery code the recipient gave you.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="deliveryOtp">Delivery code</Label>
          <Input
            id="deliveryOtp"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
          />
        </div>
        <Button type="button" onClick={handleSubmit} disabled={isPending || code.length !== OTP_LENGTH}>
          {isPending && <Loader2Icon className="animate-spin" />}
          Confirm delivery
        </Button>
      </CardContent>
    </Card>
  );
}
