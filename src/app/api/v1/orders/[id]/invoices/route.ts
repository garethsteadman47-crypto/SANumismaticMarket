import { getOrderForViewer } from "@/lib/orders";
import { OBJECT_ID_PATTERN, jsonError, jsonOk, isNextResponse } from "@/lib/api/http";
import { requireApiUser } from "@/lib/api/require-user";
import { PLATFORM_LEGAL_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/orders/:id/invoices — dual SARS invoice payloads for mobile.
 *
 * Returns print/download-ready JSON (PDF generation can wrap this later).
 * Restricted to the order's buyer or seller — same ACL as the web Invoices tab.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (isNextResponse(user)) return user;

  const { id } = await context.params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    return jsonError("Invalid order id.", 400);
  }

  try {
    const order = await getOrderForViewer(id, user.id);
    if (!order) {
      return jsonError("Order not found.", 404);
    }

    const invoices = order.invoices.map((invoice) => ({
      id: invoice.id,
      type: invoice.type,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      subtotalCents: invoice.subtotalCents,
      vatCents: invoice.vatCents,
      totalCents: invoice.totalCents,
      issuedAt: invoice.issuedAt,
      lineItems: invoice.lineItems,
      issuedById: invoice.issuedById,
      issuedToId: invoice.issuedToId,
      pdfUrl: invoice.pdfUrl,
      fromLabel:
        invoice.type === "SELLER_TO_BUYER"
          ? (order.seller.name ?? order.seller.email)
          : PLATFORM_LEGAL_NAME,
      toLabel:
        invoice.type === "SELLER_TO_BUYER"
          ? (order.buyer.name ?? order.buyer.email)
          : (order.seller.name ?? order.seller.email),
    }));

    return jsonOk({
      orderId: order.id,
      status: order.status,
      invoices,
    });
  } catch (err) {
    console.error("GET /api/v1/orders/[id]/invoices failed", err);
    return jsonError("Failed to load invoices.", 500);
  }
}
