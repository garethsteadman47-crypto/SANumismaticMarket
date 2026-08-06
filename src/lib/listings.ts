import { Prisma, ListingStatus, VerificationFeeStatus, VerificationProvider } from "@prisma/client";

import { db } from "@/lib/db";
import { lookupCertificate } from "@/lib/api/verification";
import { generateSlug } from "@/lib/slug";
import { createListingSchema, type CreateListingInput } from "@/lib/validation/listing";
import { getVerificationFeeCents } from "@/lib/utils/fees";
import { createAuctionFromListingInput } from "@/lib/listing-auction";

/**
 * Core "create listing" business logic, deliberately kept out of the
 * `"use server"` action module (`actions/listing.ts`) so it can be
 * exercised directly in integration tests without needing a live Next.js
 * request/auth context. `actions/listing.ts` is a thin wrapper that
 * resolves the current session and delegates here.
 */

export type CreateListingResult =
  | { success: true; listingId: string; slug: string; shieldAwarded: boolean; auctionId?: string }
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

  const seller = await db.user.findUnique({
    where: { id: sellerId },
    select: { subscriptionTier: true },
  });
  if (!seller) {
    return { success: false, error: "Seller account not found." };
  }

  // Auction path — create an Auction instead of (or in addition to) a fixed listing.
  if (data.saleFormat === "AUCTION") {
    return createAuctionFromListingInput(sellerId, data);
  }

  let verificationLookup: Awaited<ReturnType<typeof lookupCertificate>> | null = null;

  if (isGraded) {
    const certificateId = data.certificateId!;
    const provider = data.verificationProvider as VerificationProvider;

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
  const verificationFeeCents = getVerificationFeeCents(seller.subscriptionTier);
  const feeStatus =
    verificationFeeCents === 0 ? VerificationFeeStatus.WAIVED : VerificationFeeStatus.PENDING;

  const imageUrls = [
    data.coverImageUrl,
    data.obverseImageUrl,
    data.reverseImageUrl,
    data.certificateImageUrl,
    ...data.images,
  ].filter((url): url is string => Boolean(url && url.length > 0));
  const uniqueImages = [...new Set(imageUrls)];

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
          diameterMm: data.diameterMm,
          packageLengthCm: data.packageLengthCm,
          packageWidthCm: data.packageWidthCm,
          packageHeightCm: data.packageHeightCm,
          purityPercent: data.purityPercent,
          priceCents: data.priceCents,
          acceptsOffers: data.acceptsOffers ?? true,
          minOfferPriceCents: data.acceptsOffers ? (data.minOfferPriceCents ?? null) : null,
          autoAcceptPriceCents: data.acceptsOffers ? (data.autoAcceptPriceCents ?? null) : null,
          images: uniqueImages.length > 0 ? uniqueImages : data.images,
          coverImageUrl: data.coverImageUrl || null,
          obverseImageUrl: data.obverseImageUrl || null,
          reverseImageUrl: data.reverseImageUrl || null,
          certificateImageUrl: data.certificateImageUrl || null,
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
            grade: verificationLookup.grade ?? data.condition ?? null,
            mintage: verificationLookup.mintage,
            historicalNotes: verificationLookup.historicalNotes,
            rawApiResponse: verificationLookup.rawApiResponse as Prisma.InputJsonValue,
            shieldAwarded: verificationLookup.shieldEligible,
            feeCents: verificationFeeCents,
            feeStatus,
          },
        });

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

    // Fire-and-forget wanted-item matching (logs notification stub).
    void import("@/lib/wanted").then(({ matchWantedItemsForListing }) =>
      matchWantedItemsForListing({
        id: listing.id,
        title: data.title,
        year: data.year ?? null,
        priceCents: data.priceCents,
        condition: data.condition || null,
      })
    );

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
