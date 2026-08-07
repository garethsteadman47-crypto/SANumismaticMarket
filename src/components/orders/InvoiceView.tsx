import { InvoiceType } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatZarCents } from "@/lib/utils/currency";
import { PrintButton } from "@/components/orders/PrintButton";
import { InvoiceDownloadButton } from "@/components/orders/InvoiceDownloadButton";
import { BUYER_PROTECTION_LABEL } from "@/lib/constants";

export interface InvoiceViewData {
  id: string;
  type: InvoiceType;
  invoiceNumber: string;
  issuedAt: Date;
  currency: string;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  lineItems: { description: string; amountCents: number; quantity: number }[];
}

const TYPE_LABELS: Record<InvoiceType, string> = {
  SELLER_TO_BUYER: "Purchase Receipt (Seller → Buyer)",
  PLATFORM_TO_SELLER: "Platform Tax Invoice (Platform → Seller)",
};

export function InvoiceView({
  invoice,
  fromLabel,
  toLabel,
  orderId,
}: {
  invoice: InvoiceViewData;
  fromLabel: string;
  toLabel: string;
  orderId?: string;
}) {
  return (
    <Card className="print:shadow-none print:ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{TYPE_LABELS[invoice.type]}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {invoice.invoiceNumber} · {invoice.issuedAt.toLocaleDateString("en-ZA")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {orderId && (
            <InvoiceDownloadButton
              orderId={orderId}
              type={invoice.type}
              label="Download PDF"
            />
          )}
          <PrintButton />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">From</p>
            <p className="font-medium">{fromLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">To</p>
            <p className="font-medium">{toLabel}</p>
          </div>
        </div>

        <Separator />

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-normal">Description</th>
              <th className="pb-2 text-right font-normal">Qty</th>
              <th className="pb-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, index) => (
              <tr key={index} className="border-t">
                <td className="py-1.5">{item.description}</td>
                <td className="py-1.5 text-right">{item.quantity}</td>
                <td className="py-1.5 text-right">{formatZarCents(item.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Separator />

        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatZarCents(invoice.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {invoice.type === InvoiceType.PLATFORM_TO_SELLER ? "Output VAT (15%)" : "VAT"}
            </dt>
            <dd>{formatZarCents(invoice.vatCents)}</dd>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatZarCents(invoice.totalCents)}</dd>
          </div>
        </dl>

        {invoice.type === InvoiceType.PLATFORM_TO_SELLER && (
          <Badge variant="outline" className="w-fit">
            Deducted from your {BUYER_PROTECTION_LABEL} payout
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
