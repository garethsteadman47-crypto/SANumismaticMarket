"use server";

import { VerificationProvider } from "@prisma/client";

import { lookupCertificate, type VerificationLookupResult } from "@/lib/api/verification";
import { isCertificateLocked } from "@/lib/listings";

/**
 * Backs the interactive Certificate ID field in `ListingForm`: the seller
 * types a certificate ID, picks a registry, and hits "Verify" before ever
 * submitting the listing. This lets them see the fetched Grade / Mintage /
 * Historical Value and the "Verified Authentic Shield" up front.
 *
 * This performs the *same* lookup + anti-fraud check that
 * `createListingAction` re-runs server-side at submit time — the
 * server-side re-check is the one that's actually trusted; this action
 * only exists for a fast, friendly preview.
 */
export type CheckCertificateResult =
  | { ok: true; lookup: VerificationLookupResult; alreadyLocked: boolean }
  | { ok: false; error: string };

export async function checkCertificateAction(
  provider: VerificationProvider,
  certificateId: string
): Promise<CheckCertificateResult> {
  const trimmedId = certificateId.trim();
  if (trimmedId.length < 4) {
    return { ok: false, error: "Certificate ID is too short." };
  }

  try {
    const lookup = await lookupCertificate({ provider, certificateId: trimmedId });

    if (!lookup.found) {
      return {
        ok: false,
        error: `${provider} could not find a certificate matching "${trimmedId}". Double-check the ID and try again.`,
      };
    }

    const alreadyLocked = await isCertificateLocked(trimmedId);
    return { ok: true, lookup, alreadyLocked };
  } catch (err) {
    console.error("checkCertificateAction failed", err);
    return { ok: false, error: "Could not reach the verification service right now. Please try again shortly." };
  }
}
