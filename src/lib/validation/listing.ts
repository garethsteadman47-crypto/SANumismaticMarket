import { z } from "zod";
import { ListingCategory, ListingType, PreciousMetal, VerificationProvider } from "@prisma/client";

const currentYear = new Date().getFullYear();

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
    year: z.coerce.number().int().min(1600).max(currentYear).optional(),
    denomination: z.string().trim().max(60).optional().or(z.literal("")),
    mintage: z.coerce.number().int().positive().max(1_000_000_000).optional(),
    weightGrams: z.coerce.number().positive().max(100_000).optional(),
    purityPercent: z.coerce.number().min(0).max(100).optional(),
    priceCents: z.coerce.number().int().positive("Price must be greater than R0."),
    images: z
      .array(z.string().url("Each image must be a valid URL."))
      .min(1, "Add at least one image.")
      .max(10, "You can add up to 10 images."),

    // Only required when listingType === GRADED.
    certificateId: z.string().trim().min(4).max(40).optional(),
    verificationProvider: z.nativeEnum(VerificationProvider).optional(),
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
