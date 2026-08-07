import { InvoiceType } from "@prisma/client";

import { auth } from "@/lib/auth";
import { OBJECT_ID_PATTERN, jsonError } from "@/lib/api/http";
import { PLATFORM_LEGAL_NAME } from "@/lib/constants";
import { getOrderForViewer } from "@/lib/orders";
import { buildInvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/invoices/[orderId]
 *
 * Downloads SARS-compliant dual marketplace intermediary invoices as PDF.
 * Query:
 *   - `type=SELLER_TO_BUYER` | `PLATFORM_TO_SELLER` (default: both as sequential PDFs — first type)
 *   - `type=all` returns the buyer/seller-facing invoice preferred for the viewer
 *
 * Restricted to the order's buyer or seller.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  let userId: string | undefined;
  try {
    const session = await auth();
    userId = session?.user?.id;
  } catch (err) {
    console.error("invoices download: session failed", err);
    return jsonError("Could not verify your session.", 401);
  }
  if (!userId) return jsonError("You must be signed in.", 401);

  const { orderId } = await context.params;
  if (!OBJECT_ID_PATTERN.test(orderId)) {
    return jsonError("Invalid order id.", 400);
  }

  const order = await getOrderForViewer(orderId, userId);
  if (!order) return jsonError("Order not found.", 404);
  if (order.invoices.length === 0) {
    return jsonError("No invoices have been issued for this order yet.", 404);
  }

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");

  let invoice = order.invoices[0]!;
  if (typeParam === "PLATFORM_TO_SELLER" || typeParam === InvoiceType.PLATFORM_TO_SELLER) {
    invoice =
      order.invoices.find((row) => row.type === InvoiceType.PLATFORM_TO_SELLER) ?? invoice;
  } else if (typeParam === "SELLER_TO_BUYER" || typeParam === InvoiceType.SELLER_TO_BUYER) {
    invoice = order.invoices.find((row) => row.type === InvoiceType.SELLER_TO_BUYER) ?? invoice;
  } else if (userId === order.sellerId) {
    // Sellers default to the platform tax invoice (commission / VAT).
    invoice =
      order.invoices.find((row) => row.type === InvoiceType.PLATFORM_TO_SELLER) ?? invoice;
  } else {
    invoice = order.invoices.find((row) => row.type === InvoiceType.SELLER_TO_BUYER) ?? invoice;
  }

  const fromLabel =
    invoice.type === InvoiceType.SELLER_TO_BUYER
      ? (order.seller.name ?? order.seller.email)
      : PLATFORM_LEGAL_NAME;
  const toLabel =
    invoice.type === InvoiceType.SELLER_TO_BUYER
      ? (order.buyer.name ?? order.buyer.email)
      : (order.seller.name ?? order.seller.email);

  try {
    const pdf = await buildInvoicePdf({
      type: invoice.type,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      currency: invoice.currency,
      fromLabel,
      toLabel,
      listingTitle: order.listing.title,
      orderId: order.id,
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        amountCents: item.amountCents,
        quantity: item.quantity,
      })),
      subtotalCents: invoice.subtotalCents,
      vatCents: invoice.vatCents,
      totalCents: invoice.totalCents,
    });

    const filename = `${invoice.invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("invoice PDF generation failed", err);
    return jsonError("Could not generate the invoice PDF.", 500);
  }
}
