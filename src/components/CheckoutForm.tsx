"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, Loader2Icon } from "lucide-react";
import type { PaymentProvider } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { PAYMENT_PROVIDER_LABELS } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { createOrderAction } from "@/actions/checkout";

export function CheckoutForm({
  listingId,
  availableProviders,
  disabled,
  offerId,
}: {
  listingId: string;
  availableProviders: PaymentProvider[];
  disabled?: boolean;
  offerId?: string;
}) {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(availableProviders[0]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await createOrderAction(listingId, selectedProvider, offerId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment received — your purchase is protected until delivery is confirmed.");
      router.push(`/orders/${result.orderId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Payment method</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {availableProviders.map((provider) => {
            const isSelected = provider === selectedProvider;
            return (
              <button
                key={provider}
                type="button"
                disabled={disabled || isPending}
                onClick={() => setSelectedProvider(provider)}
                className={cn(
                  "flex items-center justify-between gap-1.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  isSelected ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted"
                )}
              >
                {PAYMENT_PROVIDER_LABELS[provider]}
                {isSelected && <CheckIcon className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
        {!availableProviders.includes("CARD") && (
          <p className="text-xs text-muted-foreground">
            Card payments are unavailable for orders of R5,000 or more — Instant EFT and Capitec Pay only.
          </p>
        )}
      </div>

      <Button type="button" size="lg" className="w-full" disabled={disabled || isPending} onClick={handleConfirm}>
        {isPending ? <Loader2Icon className="animate-spin" /> : null}
        Complete Secure Purchase
      </Button>
    </div>
  );
}
