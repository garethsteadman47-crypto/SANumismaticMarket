import { OrderStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  PAID_ESCROW: { label: "Paid — In Escrow", className: "bg-blue-500 text-white hover:bg-blue-500" },
  IN_TRANSIT: { label: "In Transit", className: "bg-amber-500 text-white hover:bg-amber-500" },
  DELIVERED: { label: "Delivered", className: "bg-teal-500 text-white hover:bg-teal-500" },
  HOLD_48H: { label: "48-Hour Hold", className: "bg-purple-500 text-white hover:bg-purple-500" },
  DISPUTE: { label: "Dispute", className: "bg-destructive text-white hover:bg-destructive" },
  SETTLED: { label: "Settled", className: "bg-emerald-600 text-white hover:bg-emerald-600" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  REFUNDED: { label: "Refunded", className: "bg-muted text-muted-foreground" },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={cn(config.className, className)}>{config.label}</Badge>;
}
