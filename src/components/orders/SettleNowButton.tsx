"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon, ZapIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { settleNowAction } from "@/actions/order";
import { BUYER_PROTECTION_LABEL } from "@/lib/constants";

/**
 * Manually simulates the scheduled job that settles `HOLD_48H` orders once
 * their hold expires (see `/api/v1/cron/settle` for the real endpoint a
 * scheduler like Vercel Cron would hit).
 */
export function SettleNowButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await settleNowAction(orderId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${BUYER_PROTECTION_LABEL} hold released — funds settled and invoices generated.`);
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={handleClick} disabled={isPending}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <ZapIcon />}
      Settle now (simulate scheduled job)
    </Button>
  );
}
