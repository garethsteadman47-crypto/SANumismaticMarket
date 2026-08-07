import Link from "next/link";
import { FileDownIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Download link for a settled order's SARS dual-invoice PDF. */
export function InvoiceDownloadButton({
  orderId,
  type,
  label = "Download invoice PDF",
  className,
}: {
  orderId: string;
  type?: "SELLER_TO_BUYER" | "PLATFORM_TO_SELLER";
  label?: string;
  className?: string;
}) {
  const href = type
    ? `/api/invoices/${orderId}?type=${type}`
    : `/api/invoices/${orderId}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5", className)}
    >
      <FileDownIcon className="size-3.5" aria-hidden />
      {label}
    </Link>
  );
}
