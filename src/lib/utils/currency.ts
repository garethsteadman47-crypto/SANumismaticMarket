const ZAR_FORMATTER = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

/** Formats an integer ZA-cents amount as a Rand currency string, e.g. `R1,234.50`. */
export function formatZarCents(cents: number): string {
  return ZAR_FORMATTER.format(cents / 100);
}

/** Converts a Rand amount (e.g. from a form input) to integer ZA cents. */
export function randsToCents(rands: number): number {
  return Math.round(rands * 100);
}

/** Converts integer ZA cents to a Rand amount (e.g. for pre-filling a form input). */
export function centsToRands(cents: number): number {
  return cents / 100;
}
