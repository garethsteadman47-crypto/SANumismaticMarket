/**
 * Mock shipping-carrier selection for high-value collectibles/bullion.
 * RAM Valuables specializes in insured, escorted transport of bullion and
 * other high-value goods in South Africa; Courier Guy is used for standard
 * tracked, insured parcels below that threshold.
 */
export interface ShippingCarrierInfo {
  name: string;
  description: string;
  insured: boolean;
  estimatedDays: string;
}

const HIGH_VALUE_THRESHOLD_CENTS = 50_000 * 100; // R50,000

export function getShippingCarrier(priceCents: number): ShippingCarrierInfo {
  if (priceCents >= HIGH_VALUE_THRESHOLD_CENTS) {
    return {
      name: "RAM Valuables",
      description:
        "A specialist high-value carrier providing door-to-door security-escorted transport and full insurance cover, used for bullion and high-value collectibles.",
      insured: true,
      estimatedDays: "2–4 business days",
    };
  }

  return {
    name: "Courier Guy",
    description: "Tracked, signature-required delivery with standard insurance cover.",
    insured: true,
    estimatedDays: "1–3 business days",
  };
}
