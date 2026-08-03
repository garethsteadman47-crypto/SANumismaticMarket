import { VerificationProvider } from "@prisma/client";
import { z } from "zod";

import { lookupCertificate } from "@/lib/api/verification";
import { isCertificateLocked } from "@/lib/listings";
import { jsonError, jsonOk } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const verifyBodySchema = z.object({
  provider: z.nativeEnum(VerificationProvider),
  certificateId: z.string().trim().min(4).max(40),
});

/**
 * POST /api/v1/verify — certificate registry lookup + anti-fraud lock check.
 *
 * Same business logic as `checkCertificateAction` / the listing form's
 * interactive Verify button. Public (no auth) so a mobile seller can preview
 * a certificate before signing a listing create call.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be JSON.", 400);
  }

  const parsed = verifyBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(first?.message ?? "Invalid verification payload.", 422, {
      field: first?.path.join("."),
      details: parsed.error.flatten(),
    });
  }

  try {
    const lookup = await lookupCertificate(parsed.data);
    if (!lookup.found) {
      return jsonError(
        `${parsed.data.provider} could not find a certificate matching "${parsed.data.certificateId}".`,
        404
      );
    }

    const alreadyLocked = await isCertificateLocked(parsed.data.certificateId);
    return jsonOk({ lookup, alreadyLocked, shieldEligible: lookup.shieldEligible });
  } catch (err) {
    console.error("POST /api/v1/verify failed", err);
    return jsonError("Could not reach the verification service right now.", 502);
  }
}
