import { describe, expect, it } from "vitest";
import { CARD_PAYMENT_MAX_CENTS, getAvailablePaymentProviders, isCardPaymentAllowed } from "./payments";

describe("isCardPaymentAllowed", () => {
  it("allows card payments below R5,000", () => {
    expect(isCardPaymentAllowed(499_999)).toBe(true);
  });

  it("disallows card payments at or above R5,000", () => {
    expect(isCardPaymentAllowed(CARD_PAYMENT_MAX_CENTS)).toBe(false);
    expect(isCardPaymentAllowed(1_000_000)).toBe(false);
  });
});

describe("getAvailablePaymentProviders", () => {
  it("includes CARD for low-value orders", () => {
    expect(getAvailablePaymentProviders(100_000)).toEqual(["OZOW", "STITCH", "CAPITEC_PAY", "CARD"]);
  });

  it("excludes CARD for high-value orders", () => {
    expect(getAvailablePaymentProviders(10_000_000)).toEqual(["OZOW", "STITCH", "CAPITEC_PAY"]);
  });
});
