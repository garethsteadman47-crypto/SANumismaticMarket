import crypto from "node:crypto";

/**
 * Delivery OTP generation for the escrow handover flow.
 *
 * In production this code would be sent to the buyer out-of-band (SMS/
 * push) and never rendered in the app; here (no SMS provider wired up) we
 * store it in plain text on the order and display it to the buyer on
 * `/orders/[id]` so they can hand it to the courier.
 */
export const OTP_LENGTH = 6;
/** Delivery can take a while to arrange — give the OTP a generous window. */
export const OTP_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const MAX_OTP_ATTEMPTS = 5;

/** Cryptographically secure random 6-digit code, zero-padded (e.g. "004821"). */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export function isOtpFormatValid(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code.trim());
}
