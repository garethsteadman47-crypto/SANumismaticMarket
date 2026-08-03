import { z } from "zod";
import { ListingCategory, ListingType, PreciousMetal, VerificationProvider } from "@prisma/client";

const currentYear = new Date().getFullYear();

/**
 * A plain HTML number input that's left blank submits `""`, not
 * `undefined` — but `z.coerce.number()` coerces `""` to `0`, which then
 * fails a `.positive()`/`.min()` check even though the field is meant to
 * be optional. This wraps a number schema so an empty string (or
 * `null`/`undefined`) is treated as "not provided" *before* coercion.
 */
function optionalNumber<Schema extends z.ZodType<number, unknown>>(schema: Schema) {
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    schema.optional()
  );
}

/**
 * Server-side source of truth for "create listing" input. The client form
 * (`components/ListingForm.tsx`) uses this same schema for inline
 * validation, but the server action re-validates independently — never
 * trust client input for a marketplace that moves real money.
 */
export const createListingSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(120),
    description: z.string().trim().min(10, "Description must be at least 10 characters.").max(5000),
    category: z.nativeEnum(ListingCategory),
    listingType: z.nativeEnum(ListingType),
    metal: z.nativeEnum(PreciousMetal).default(PreciousMetal.NOT_APPLICABLE),
    condition: z.string().trim().max(60).optional().or(z.literal("")),
    year: optionalNumber(z.coerce.number().int().min(1600).max(currentYear)),
    denomination: z.string().trim().max(60).optional().or(z.literal("")),
    mintage: optionalNumber(z.coerce.number().int().positive().max(1_000_000_000)),
    weightGrams: optionalNumber(z.coerce.number().positive().max(100_000)),
    purityPercent: optionalNumber(z.coerce.number().min(0).max(100)),
    priceCents: z.coerce.number().int().positive("Price must be greater than R0."),
    images: z
      .array(z.string().url("Each image must be a valid URL."))
      .min(1, "Add at least one image.")
      .max(10, "You can add up to 10 images."),

    // Only required when listingType === GRADED. Also accepts an empty
    // string: React Hook Form doesn't unregister these fields' values when
    // the Certificate Verification section unmounts (switching away from
    // GRADED), so a RAW/BULLION submission may carry over a stray "" here.
    // `superRefine` below treats "" the same as "not provided".
    certificateId: z.union([z.string().trim().min(4).max(40), z.literal("")]).optional(),
    verificationProvider: z.union([z.nativeEnum(VerificationProvider), z.literal("")]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.listingType === ListingType.GRADED) {
      if (!data.certificateId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["certificateId"],
          message: "A certificate ID is required for graded listings.",
        });
      }
      if (!data.verificationProvider) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["verificationProvider"],
          message: "Select which registry issued the certificate.",
        });
      }
    }
  });

export type CreateListingInput = z.input<typeof createListingSchema>;
export type CreateListingParsed = z.output<typeof createListingSchema>;
