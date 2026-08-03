/**
 * South African mobile number validation + normalization for the
 * phone-number sign-in flow (see `lib/phone-otp.ts` and `lib/auth.ts`'s
 * "phone-otp" Credentials provider).
 *
 * Only +27 (South Africa) is supported for now — the country-code dropdown
 * in the sign-in UI shows a couple of other codes for a realistic feel, but
 * `isSupportedCountryCode` gates them off until a real international SMS
 * gateway is wired up.
 */

export interface CountryCodeOption {
  code: string;
  iso2: string;
  label: string;
}

export const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { code: "+27", iso2: "ZA", label: "🇿🇦 South Africa (+27)" },
  { code: "+1", iso2: "US", label: "🇺🇸 United States (+1)" },
  { code: "+44", iso2: "GB", label: "🇬🇧 United Kingdom (+44)" },
];

export const DEFAULT_COUNTRY_CODE = "+27";

export function isSupportedCountryCode(code: string): boolean {
  return code === "+27";
}

const SA_LOCAL_PATTERN = /^0[678]\d{8}$/; // e.g. 0821234567
const SA_E164_PATTERN = /^\+27[678]\d{8}$/; // e.g. +27821234567

function stripFormatting(input: string): string {
  return input.replace(/[\s()-]/g, "");
}

/** True for both local (`0821234567`) and E.164 (`+27821234567`) SA mobile formats. */
export function isValidSaPhone(rawInput: string): boolean {
  const value = stripFormatting(rawInput);
  return SA_LOCAL_PATTERN.test(value) || SA_E164_PATTERN.test(value);
}

/**
 * Normalizes a South African mobile number (local `0` prefix or already
 * E.164) into a single canonical E.164 form, e.g. `"0821234567"` and
 * `"+27 82 123 4567"` both become `"+27821234567"`.
 *
 * Returns `null` if the input isn't a recognized SA mobile number.
 */
export function normalizeSaPhone(rawInput: string): string | null {
  const value = stripFormatting(rawInput);
  if (SA_E164_PATTERN.test(value)) return value;
  if (SA_LOCAL_PATTERN.test(value)) return `+27${value.slice(1)}`;
  return null;
}

/** Combines a country-code dropdown value + a local-format input into one validated E.164 number. */
export function combineCountryCodeAndNumber(countryCode: string, localNumber: string): string | null {
  if (countryCode !== "+27") return null;
  return normalizeSaPhone(localNumber) ?? normalizeSaPhone(`0${stripFormatting(localNumber).replace(/^0/, "")}`);
}

/** Masks the middle digits for display, e.g. `+27821234567` -> `+27•••••4567`. */
export function maskPhone(e164Phone: string): string {
  if (e164Phone.length <= 7) return e164Phone;
  const prefix = e164Phone.slice(0, 3);
  const last4 = e164Phone.slice(-4);
  const maskedLength = e164Phone.length - prefix.length - last4.length;
  return `${prefix}${"•".repeat(Math.max(maskedLength, 3))}${last4}`;
}
