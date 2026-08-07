import PDFDocument from "pdfkit";
import { InvoiceType } from "@prisma/client";

import { PLATFORM_LEGAL_NAME, SITE_NAME, BUYER_PROTECTION_LABEL } from "@/lib/constants";
import { formatZarCents } from "@/lib/utils/currency";

export type InvoicePdfInput = {
  type: InvoiceType;
  invoiceNumber: string;
  issuedAt: Date;
  currency: string;
  fromLabel: string;
  toLabel: string;
  listingTitle: string;
  orderId: string;
  lineItems: { description: string; amountCents: number; quantity: number }[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
};

function typeTitle(type: InvoiceType): string {
  return type === InvoiceType.SELLER_TO_BUYER
    ? "Tax Invoice — Seller to Buyer (Marketplace Intermediary)"
    : "Tax Invoice — Platform to Seller (Commission & Fees)";
}

/**
 * Builds a SARS-oriented dual-invoice PDF buffer for one Invoice row.
 * Uses pdfkit (no browser) so `/api/invoices/[orderId]` can stream downloads.
 */
export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(18)
      .fillColor("#0f172a")
      .text(SITE_NAME, { continued: false });
    doc.fontSize(10).fillColor("#64748b").text(PLATFORM_LEGAL_NAME);
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor("#0f172a").text(typeTitle(input.type));
    doc.fontSize(10).fillColor("#64748b").text(`Invoice ${input.invoiceNumber}`);
    doc.text(`Issued ${input.issuedAt.toLocaleDateString("en-ZA")} · Order ${input.orderId}`);
    doc.moveDown();

    doc.fontSize(11).fillColor("#0f172a").text("From", { continued: false });
    doc.fontSize(10).fillColor("#334155").text(input.fromLabel);
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#0f172a").text("To");
    doc.fontSize(10).fillColor("#334155").text(input.toLabel);
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#0f172a").text("Supply");
    doc.fontSize(10).fillColor("#334155").text(input.listingTitle);
    doc.moveDown();

    // Line items table header
    doc.fontSize(10).fillColor("#64748b");
    const tableTop = doc.y;
    doc.text("Description", 50, tableTop, { width: 280 });
    doc.text("Qty", 340, tableTop, { width: 40, align: "right" });
    doc.text("Amount", 400, tableTop, { width: 140, align: "right" });
    doc
      .moveTo(50, tableTop + 14)
      .lineTo(545, tableTop + 14)
      .strokeColor("#e2e8f0")
      .stroke();

    let y = tableTop + 22;
    doc.fillColor("#0f172a");
    for (const item of input.lineItems) {
      doc.text(item.description, 50, y, { width: 280 });
      doc.text(String(item.quantity), 340, y, { width: 40, align: "right" });
      doc.text(formatZarCents(item.amountCents), 400, y, { width: 140, align: "right" });
      y += 18;
    }

    doc.y = y + 8;
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#e2e8f0")
      .stroke();
    doc.moveDown(0.6);

    const vatLabel =
      input.type === InvoiceType.PLATFORM_TO_SELLER ? "Output VAT (15%)" : "VAT (15%)";

    doc.fontSize(10).fillColor("#64748b");
    doc.text(`Subtotal: ${formatZarCents(input.subtotalCents)}`, { align: "right" });
    doc.text(`${vatLabel}: ${formatZarCents(input.vatCents)}`, { align: "right" });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#0f172a").text(`Total (${input.currency}): ${formatZarCents(input.totalCents)}`, {
      align: "right",
    });

    doc.moveDown(1.5);
    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(
        `Issued via ${SITE_NAME} as a marketplace intermediary. Covered by ${BUYER_PROTECTION_LABEL}. ` +
          "Retain this document for SARS / VAT record-keeping. This is a computer-generated tax invoice.",
        { align: "left", width: 495 },
      );

    doc.end();
  });
}
