import { describe, expect, it } from "vitest";
import { InvoiceType } from "@prisma/client";
import { buildOrderInvoices, buildPlatformToSellerInvoice, buildSellerToBuyerInvoice } from "./invoicing";
import { calculateOrderFeeBreakdown } from "./fees";

const ORDER_INPUT = {
  itemPriceCents: 2_000_000, // R20,000
  currency: "ZAR",
  commissionRateBps: 300, // 3% (Gold, Tier 2)
  commissionAmountCents: 60_000,
  verificationFeeCents: 1_500,
  adBoostFeeCents: 0,
  platformVatCents: 9_225,
  buyerId: "buyer-1",
  sellerId: "seller-1",
  listingTitle: "1898 ZAR Single Pond",
};

describe("buildSellerToBuyerInvoice", () => {
  it("is a VAT-free receipt for the full sale price", () => {
    const invoice = buildSellerToBuyerInvoice(ORDER_INPUT);

    expect(invoice.type).toBe(InvoiceType.SELLER_TO_BUYER);
    expect(invoice.issuedById).toBe("seller-1");
    expect(invoice.issuedToId).toBe("buyer-1");
    expect(invoice.subtotalCents).toBe(2_000_000);
    expect(invoice.vatCents).toBe(0);
    expect(invoice.totalCents).toBe(2_000_000);
    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.lineItems[0].description).toContain("1898 ZAR Single Pond");
  });

  it("generates a unique invoice number each time", () => {
    const a = buildSellerToBuyerInvoice(ORDER_INPUT);
    const b = buildSellerToBuyerInvoice(ORDER_INPUT);
    expect(a.invoiceNumber).not.toBe(b.invoiceNumber);
    expect(a.invoiceNumber).toMatch(/^SB-/);
  });
});

describe("buildPlatformToSellerInvoice", () => {
  it("breaks down commission, cert fee, and VAT applied only to platform fees", () => {
    const invoice = buildPlatformToSellerInvoice(ORDER_INPUT);

    expect(invoice.type).toBe(InvoiceType.PLATFORM_TO_SELLER);
    expect(invoice.issuedById).toBeNull(); // the platform is the issuer
    expect(invoice.issuedToId).toBe("seller-1");
    expect(invoice.subtotalCents).toBe(61_500); // commission + cert fee
    expect(invoice.vatCents).toBe(9_225);
    expect(invoice.totalCents).toBe(70_725);
    expect(invoice.invoiceNumber).toMatch(/^PS-/);

    const descriptions = invoice.lineItems.map((item) => item.description);
    expect(descriptions.some((d) => d.includes("commission"))).toBe(true);
    expect(descriptions.some((d) => d.includes("Certificate verification"))).toBe(true);
    // No ad boost line item since adBoostFeeCents is 0.
    expect(descriptions.some((d) => d.includes("Ad boost"))).toBe(false);
  });

  it("includes an ad boost line item when present", () => {
    const invoice = buildPlatformToSellerInvoice({ ...ORDER_INPUT, adBoostFeeCents: 20_000 });
    const descriptions = invoice.lineItems.map((item) => item.description);
    expect(descriptions.some((d) => d.includes("Ad boost"))).toBe(true);
    expect(invoice.subtotalCents).toBe(81_500);
  });

  it("matches the platform's total retained fees computed by calculateOrderFeeBreakdown", () => {
    const breakdown = calculateOrderFeeBreakdown({
      itemPriceCents: ORDER_INPUT.itemPriceCents,
      subscriptionTier: "GOLD",
      verificationFeeCents: ORDER_INPUT.verificationFeeCents,
    });
    const invoice = buildPlatformToSellerInvoice({
      ...ORDER_INPUT,
      commissionRateBps: breakdown.commissionRateBps,
      commissionAmountCents: breakdown.commissionAmountCents,
      platformVatCents: breakdown.platformVatCents,
    });

    expect(invoice.totalCents).toBe(breakdown.totalPlatformFeesCents);
  });
});

describe("buildOrderInvoices", () => {
  it("returns both invoices, summing to the full item price plus zero net (buyer pays item price, seller nets item price minus platform total)", () => {
    const [sellerToBuyer, platformToSeller] = buildOrderInvoices(ORDER_INPUT);
    const sellerPayoutCents = ORDER_INPUT.itemPriceCents - platformToSeller.totalCents;

    expect(sellerToBuyer.totalCents).toBe(ORDER_INPUT.itemPriceCents);
    expect(sellerPayoutCents).toBe(1_929_275);
  });
});
