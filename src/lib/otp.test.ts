import { describe, expect, it } from "vitest";
import { OTP_LENGTH, generateOtpCode, isOtpFormatValid } from "./otp";

describe("generateOtpCode", () => {
  it("generates a zero-padded 6-digit code", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toHaveLength(OTP_LENGTH);
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("produces varied codes across calls", () => {
    const codes = new Set(Array.from({ length: 30 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("isOtpFormatValid", () => {
  it("accepts a well-formed 6-digit code", () => {
    expect(isOtpFormatValid("123456")).toBe(true);
    expect(isOtpFormatValid("000000")).toBe(true);
  });

  it("accepts a code with surrounding whitespace", () => {
    expect(isOtpFormatValid("  123456  ")).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(isOtpFormatValid("12345")).toBe(false);
    expect(isOtpFormatValid("1234567")).toBe(false);
    expect(isOtpFormatValid("12345a")).toBe(false);
    expect(isOtpFormatValid("")).toBe(false);
  });
});
