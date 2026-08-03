import { Prisma, ListingStatus, VerificationFeeStatus, VerificationProvider } from "@prisma/client";

import { db } from "@/lib/db";
import { lookupCertificate } from "@/lib/api/verification";
import { generateSlug } from "@/lib/slug";
import { createListingSchema, type CreateListingInput } from "@/lib/validation/listing";

/**
 * Core "create listing" business logic, deliberately kept out of the
 * `"use server"` action module (`actions/listing.ts`) so it can be
 * exercised directly in integration tests without needing a live Next.js
 * request/auth context. `actions/listing.ts` is a thin wrapper that
 * resolves the current session and delegates here.
 */

export type CreateListingResult =
  | { success: true; listingId: string; slug: string; shieldAwarded: boolean }
  | { success: false; error: string; field?: string };

export async function createListing(sellerId: string, input: CreateListingInput): Promise<CreateListingResult> {
  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid listing data.",
      field: firstIssue?.path.join("."),
    };
  }
  const data = parsed.data;
  const isGraded = data.listingType === "GRADED";

  let verificationLookup: Awaited<ReturnType<typeof lookupCertificate>> | null = null;

  if (isGraded) {
    const certificateId = data.certificateId!;
    const provider = data.verificationProvider as VerificationProvider;

    // Fast, friendly pre-check. The unique index on `CertificateLock` below
    // is the real, race-safe guarantee — this just avoids doing an
    // external "API" lookup for a certificate we already know is taken.
    const existingLock = await db.certificateLock.findUnique({ where: { certificateId } });
    if (existingLock) {
      return {
        success: false,
        error: "This certificate is already attached to another active listing.",
        field: "certificateId",
      };
    }

    verificationLookup = await lookupCertificate({ provider, certificateId });
    if (!verificationLookup.found) {
      return {
        success: false,
        error: `${provider} could not find a certificate matching "${certificateId}".`,
        field: "certificateId",
      };
    }
  }

  const slug = generateSlug(data.title);

  try {
    const listing = await db.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: {
          sellerId,
          slug,
          title: data.title,
          description: data.description,
          category: data.category,
          listingType: data.listingType,
          metal: data.metal,
          condition: data.condition || null,
          year: data.year,
          denomination: data.denomination || null,
          mintage: data.mintage,
          weightGrams: data.weightGrams,
          purityPercent: data.purityPercent,
          priceCents: data.priceCents,
          images: data.images,
          certificateId: isGraded ? data.certificateId : null,
          status: ListingStatus.ACTIVE,
        },
      });

      if (isGraded && verificationLookup) {
        await tx.verification.create({
          data: {
            listingId: created.id,
            provider: data.verificationProvider as VerificationProvider,
            certificateId: data.certificateId!,
            grade: verificationLookup.grade,
            mintage: verificationLookup.mintage,
            historicalNotes: verificationLookup.historicalNotes,
            rawApiResponse: verificationLookup.rawApiResponse as Prisma.InputJsonValue,
            shieldAwarded: verificationLookup.shieldEligible,
            // R15 flat fee — never charged upfront. Only deducted from the
            // seller's escrow payout once the sale settles (see
            // lib/utils/fees.ts `calculateOrderFeeBreakdown`).
            feeCents: 1500,
            feeStatus: VerificationFeeStatus.PENDING,
          },
        });

        // The unique index on `certificateId` is the real anti-fraud
        // guarantee: if another request raced us and locked this
        // certificate first, this insert throws (Prisma error P2002) and
        // the whole transaction — including the listing above — rolls
        // back atomically.
        await tx.certificateLock.create({
          data: {
            certificateId: data.certificateId!,
            provider: data.verificationProvider as VerificationProvider,
            listingId: created.id,
          },
        });
      }

      return created;
    });

    return {
      success: true,
      listingId: listing.id,
      slug: listing.slug,
      shieldAwarded: verificationLookup?.shieldEligible ?? false,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(",") : String(err.meta?.target ?? "");
      if (target.includes("certificateId")) {
        return {
          success: false,
          error: "This certificate was just claimed by another listing. Please refresh and try again.",
          field: "certificateId",
        };
      }
      return { success: false, error: "A listing conflict occurred. Please try submitting again." };
    }

    console.error("createListing failed", err);
    return { success: false, error: "Something went wrong while creating your listing. Please try again." };
  }
}

export interface CertificateAvailabilityResult {
  found: boolean;
  alreadyLocked: boolean;
}

/** Used by the interactive certificate check to report lock status without exposing full lookup details twice. */
export async function isCertificateLocked(certificateId: string): Promise<boolean> {
  const existingLock = await db.certificateLock.findUnique({ where: { certificateId } });
  return Boolean(existingLock);
}

export type { CreateListingInput };
