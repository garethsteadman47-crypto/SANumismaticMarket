import { describe, expect, it } from "vitest";

import {
  combineCountryCodeAndNumber,
  isSupportedCountryCode,
  isValidSaPhone,
  maskPhone,
  normalizeSaPhone,
} from "./phone";

describe("isValidSaPhone", () => {
  it("accepts local 0-prefixed SA mobile numbers", () => {
    expect(isValidSaPhone("0821234567")).toBe(true);
    expect(isValidSaPhone("0731234567")).toBe(true);
    expect(isValidSaPhone("0601234567")).toBe(true);
  });

  it("accepts E.164 SA mobile numbers, with or without spacing", () => {
    expect(isValidSaPhone("+27821234567")).toBe(true);
    expect(isValidSaPhone("+27 82 123 4567")).toBe(true);
  });

  it("rejects numbers that are the wrong length or prefix", () => {
    expect(isValidSaPhone("08212345")).toBe(false); // too short
    expect(isValidSaPhone("012345678")).toBe(false); // starts 01, not a mobile prefix
    expect(isValidSaPhone("+1 415 555 0132")).toBe(false); // not SA
    expect(isValidSaPhone("not a phone")).toBe(false);
  });
});

describe("normalizeSaPhone", () => {
  it("converts a local number to E.164", () => {
    expect(normalizeSaPhone("0821234567")).toBe("+27821234567");
  });

  it("strips spaces/dashes before normalizing", () => {
    expect(normalizeSaPhone("082 123 4567")).toBe("+27821234567");
    expect(normalizeSaPhone("082-123-4567")).toBe("+27821234567");
  });

  it("passes through an already-E.164 number unchanged", () => {
    expect(normalizeSaPhone("+27821234567")).toBe("+27821234567");
  });

  it("returns null for invalid input", () => {
    expect(normalizeSaPhone("not a phone")).toBeNull();
  });
});

describe("combineCountryCodeAndNumber", () => {
  it("combines +27 with a local number", () => {
    expect(combineCountryCodeAndNumber("+27", "0821234567")).toBe("+27821234567");
  });

  it("combines +27 with a number missing its leading 0", () => {
    expect(combineCountryCodeAndNumber("+27", "821234567")).toBe("+27821234567");
  });

  it("returns null for unsupported country codes", () => {
    expect(combineCountryCodeAndNumber("+1", "4155550132")).toBeNull();
  });
});

describe("isSupportedCountryCode", () => {
  it("only supports +27 for now", () => {
    expect(isSupportedCountryCode("+27")).toBe(true);
    expect(isSupportedCountryCode("+1")).toBe(false);
    expect(isSupportedCountryCode("+44")).toBe(false);
  });
});

describe("maskPhone", () => {
  it("masks the middle digits, keeping the country code and last 4 visible", () => {
    expect(maskPhone("+27821234567")).toBe("+27•••••4567");
  });

  it("returns short strings unchanged", () => {
    expect(maskPhone("+271")).toBe("+271");
  });
});
