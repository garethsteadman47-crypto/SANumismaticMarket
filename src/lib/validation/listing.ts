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
 * Server-side source of truth for "create listing" input. The listing wizard
 * uses this same schema for inline validation; the server action re-validates.
 */
export const createListingSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(120),
    description: z.string().trim().min(10, "Description must be at least 10 characters.").max(5000),
    category: z.nativeEnum(ListingCategory).default(ListingCategory.COINS),
    listingType: z.nativeEnum(ListingType),
    metal: z.nativeEnum(PreciousMetal).default(PreciousMetal.NOT_APPLICABLE),
    condition: z.string().trim().max(60).optional().or(z.literal("")),
    year: optionalNumber(z.coerce.number().int().min(1600).max(currentYear)),
    denomination: z.string().trim().max(60).optional().or(z.literal("")),
    mintage: optionalNumber(z.coerce.number().int().positive().max(1_000_000_000)),
    weightGrams: optionalNumber(z.coerce.number().positive().max(100_000)),
    diameterMm: optionalNumber(z.coerce.number().positive().max(500)),
    packageLengthCm: optionalNumber(z.coerce.number().positive().max(200)),
    packageWidthCm: optionalNumber(z.coerce.number().positive().max(200)),
    packageHeightCm: optionalNumber(z.coerce.number().positive().max(200)),
    purityPercent: optionalNumber(z.coerce.number().min(0).max(100)),
    priceCents: z.coerce.number().int().positive("Price must be greater than R0."),
    acceptsOffers: z.boolean().default(true),
    saleFormat: z.enum(["FIXED", "AUCTION"]).default("FIXED"),
    auctionEndsInDays: optionalNumber(z.coerce.number().int().min(1).max(30)),
    images: z
      .array(z.string().url("Each image must be a valid URL."))
      .min(1, "Add at least one image.")
      .max(10, "You can add up to 10 images."),
    coverImageUrl: z.union([z.string().url(), z.literal("")]).optional(),
    obverseImageUrl: z.union([z.string().url(), z.literal("")]).optional(),
    reverseImageUrl: z.union([z.string().url(), z.literal("")]).optional(),
    certificateImageUrl: z.union([z.string().url(), z.literal("")]).optional(),

    certificateId: z.union([z.string().trim().min(4).max(40), z.literal("")]).optional(),
    verificationProvider: z.union([z.nativeEnum(VerificationProvider), z.literal("")]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.listingType === ListingType.GRADED) {
      if (!data.certificateId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["certificateId"],
          message: "A slab serial / certificate ID is required for graded listings.",
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
    if (data.saleFormat === "AUCTION" && !data.auctionEndsInDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["auctionEndsInDays"],
        message: "Choose how many days the auction should run.",
      });
    }
  });

export type CreateListingInput = z.input<typeof createListingSchema>;
export type CreateListingParsed = z.output<typeof createListingSchema>;
