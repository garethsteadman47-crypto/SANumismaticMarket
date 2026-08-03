import { InvoiceType } from "@prisma/client";

/**
 * SARS-compliant dual-invoice generation.
 *
 * On every settled order, two invoices are generated:
 *
 *   1. SELLER_TO_BUYER — the purchase receipt for the collectible/bullion
 *      asset itself. This is a private, peer-to-peer sale of a
 *      collectible, so no VAT is charged on this invoice.
 *   2. PLATFORM_TO_SELLER — the platform's tax invoice to the seller,
 *      breaking down its own commission, the R15 certificate verification
 *      fee, and any ad-boost spend, with 15% SARS output VAT applied
 *      *only* to those platform service fees (never to the sale price).
 *
 * Both invoices are built entirely from figures already locked in on the
 * `Order` at checkout time (see `lib/orders.ts` / `lib/utils/fees.ts`) —
 * nothing here recomputes rates, so an invoice always reflects exactly
 * what the seller agreed to at the time of sale.
 */

function generateInvoiceNumber(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export interface InvoiceLineItemData {
  description: string;
  amountCents: number;
  quantity: number;
}

export interface InvoiceData {
  type: InvoiceType;
  invoiceNumber: string;
  issuedById: string | null;
  issuedToId: string;
  lineItems: InvoiceLineItemData[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  currency: string;
}

export interface OrderInvoiceInput {
  itemPriceCents: number;
  currency: string;
  commissionRateBps: number;
  commissionAmountCents: number;
  verificationFeeCents: number;
  adBoostFeeCents: number;
  platformVatCents: number;
  buyerId: string;
  sellerId: string;
  listingTitle: string;
}

/** Invoice 1: the seller's purchase receipt to the buyer, for the asset itself. */
export function buildSellerToBuyerInvoice(order: OrderInvoiceInput): InvoiceData {
  return {
    type: InvoiceType.SELLER_TO_BUYER,
    invoiceNumber: generateInvoiceNumber("SB"),
    issuedById: order.sellerId,
    issuedToId: order.buyerId,
    lineItems: [{ description: `Purchase: ${order.listingTitle}`, amountCents: order.itemPriceCents, quantity: 1 }],
    subtotalCents: order.itemPriceCents,
    // Peer-to-peer collectible sale — not a VAT-registered supply.
    vatCents: 0,
    totalCents: order.itemPriceCents,
    currency: order.currency,
  };
}

/** Invoice 2: the platform's tax invoice to the seller for its own fees. */
export function buildPlatformToSellerInvoice(order: OrderInvoiceInput): InvoiceData {
  const lineItems: InvoiceLineItemData[] = [
    {
      description: `Platform commission (${(order.commissionRateBps / 100).toFixed(2)}%)`,
      amountCents: order.commissionAmountCents,
      quantity: 1,
    },
  ];
  if (order.verificationFeeCents > 0) {
    lineItems.push({
      description: "Certificate verification fee",
      amountCents: order.verificationFeeCents,
      quantity: 1,
    });
  }
  if (order.adBoostFeeCents > 0) {
    lineItems.push({ description: "Ad boost fee", amountCents: order.adBoostFeeCents, quantity: 1 });
  }

  const subtotalCents = order.commissionAmountCents + order.verificationFeeCents + order.adBoostFeeCents;

  return {
    type: InvoiceType.PLATFORM_TO_SELLER,
    invoiceNumber: generateInvoiceNumber("PS"),
    // The platform itself is the issuer — no User record for it.
    issuedById: null,
    issuedToId: order.sellerId,
    lineItems,
    subtotalCents,
    // 15% SARS output VAT, applied strictly to the platform's own service
    // fees (never to the underlying sale price).
    vatCents: order.platformVatCents,
    totalCents: subtotalCents + order.platformVatCents,
    currency: order.currency,
  };
}

/** Builds both settlement invoices for an order. */
export function buildOrderInvoices(order: OrderInvoiceInput): [InvoiceData, InvoiceData] {
  return [buildSellerToBuyerInvoice(order), buildPlatformToSellerInvoice(order)];
}
