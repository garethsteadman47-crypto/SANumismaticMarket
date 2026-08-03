import { PaymentProvider } from "@prisma/client";

/**
 * Payment gateway eligibility rules — groundwork for the Step 5 checkout
 * pipeline. Card payments are restricted to lower-value orders; Instant
 * EFT (Ozow/Stitch) and Capitec Pay have no upper limit, which is why
 * they're the default rails for high-value numismatic/bullion purchases.
 */
export const CARD_PAYMENT_MAX_CENTS = 5_000 * 100; // R5,000

export function isCardPaymentAllowed(priceCents: number): boolean {
  return priceCents < CARD_PAYMENT_MAX_CENTS;
}

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  OZOW: "Ozow (Instant EFT)",
  STITCH: "Stitch (Instant EFT)",
  CAPITEC_PAY: "Capitec Pay",
  CARD: "Card",
};

export function getAvailablePaymentProviders(priceCents: number): PaymentProvider[] {
  const providers: PaymentProvider[] = [PaymentProvider.OZOW, PaymentProvider.STITCH, PaymentProvider.CAPITEC_PAY];
  if (isCardPaymentAllowed(priceCents)) {
    providers.push(PaymentProvider.CARD);
  }
  return providers;
}
