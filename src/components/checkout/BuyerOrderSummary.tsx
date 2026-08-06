import { formatZarCents } from "@/lib/utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface BuyerCheckoutItemization {
  itemPriceCents: number;
  buyerTierLabel: string;
  buyerCommissionRatePercent: number;
  buyerFeeCents: number;
  buyerShippingShareCents: number;
  totalBuyerPayableCents: number;
}

/**
 * Clear buyer-facing checkout itemization:
 * Item price + platform fee (buyer tier rate) + 50% shipping = total payable.
 */
export function BuyerOrderSummary({ itemization }: { itemization: BuyerCheckoutItemization }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Order summary</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Item price</dt>
            <dd className="font-medium">{formatZarCents(itemization.itemPriceCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">
              Platform fee ({itemization.buyerTierLabel} · {itemization.buyerCommissionRatePercent.toFixed(1)}%)
            </dt>
            <dd className="font-medium">+{formatZarCents(itemization.buyerFeeCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Shipping share (50%)</dt>
            <dd className="font-medium">+{formatZarCents(itemization.buyerShippingShareCents)}</dd>
          </div>
          <Separator className="my-1" />
          <div className="flex items-center justify-between gap-4 text-base">
            <dt className="font-semibold">Total payable</dt>
            <dd className="font-semibold text-amber-700 dark:text-amber-400">
              {formatZarCents(itemization.totalBuyerPayableCents)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
