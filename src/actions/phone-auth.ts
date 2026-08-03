"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { requestPhoneOtp } from "@/lib/phone-otp";
import { combineCountryCodeAndNumber, isSupportedCountryCode } from "@/lib/phone";
import type { AuthActionResult } from "@/lib/validation/auth";

export type RequestPhoneOtpResult =
  | { success: true; phone: string; demoCode?: string }
  | { success: false; error: string };

/** Validates + normalizes the phone, then sends (mock) an OTP. */
export async function requestPhoneOtpAction(countryCode: string, localNumber: string): Promise<RequestPhoneOtpResult> {
  if (!isSupportedCountryCode(countryCode)) {
    return { success: false, error: "Only South African (+27) numbers are currently supported for sign-in." };
  }

  const phone = combineCountryCodeAndNumber(countryCode, localNumber);
  if (!phone) {
    return { success: false, error: "Enter a valid South African mobile number, e.g. 082 123 4567." };
  }

  const result = await requestPhoneOtp(phone);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, phone, demoCode: result.demoCode };
}

/** Verifies the OTP and signs the user in (creating a lightweight account on first sign-in). */
export async function verifyPhoneOtpAction(phone: string, code: string): Promise<AuthActionResult> {
  try {
    await signIn("phone-otp", { phone, code, redirect: false });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: "Incorrect or expired code. Please try again or request a new one." };
    }
    throw err;
  }
}
