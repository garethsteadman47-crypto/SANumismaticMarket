import { VerificationProvider } from "@prisma/client";
import { hashString, intBetween, mulberry32, pick } from "@/lib/mock-random";

/**
 * Mock external API hooks for the numismatic certificate registries.
 *
 * These simulate live lookups against SANGS, NGC, PCGS, and Hern's
 * Handbook. Nothing here makes a real network call — every provider
 * "endpoint" below deterministically derives a plausible response from the
 * certificate ID so that:
 *
 *   1. Looking up the same certificate twice always returns the same
 *      metadata (important for the "Create Listing" preview flow, where a
 *      seller may re-verify before submitting).
 *   2. Different certificate IDs plausibly produce different results,
 *      without needing a real registry to talk to.
 *
 * Swap the provider functions below for real HTTP calls once each
 * registry's actual API is available — the return shape
 * (`VerificationLookupResult`) is designed to stay stable across that
 * change.
 */

export interface VerificationLookupResult {
  provider: VerificationProvider;
  certificateId: string;
  /** Whether the registry recognizes this certificate at all. */
  found: boolean;
  /**
   * Grading-scale grade (e.g. "MS65", "PF69 UCAM"). Not applicable for
   * HERNS, which is a reference/valuation catalog rather than a slabbing
   * authority — it returns `catalogNumber` instead.
   */
  grade?: string;
  /** Hern's Handbook catalog/reference number, e.g. "KM# 5.1". */
  catalogNumber?: string;
  mintage?: number;
  historicalNotes?: string;
  /** Best-effort current market value estimate, in ZA cents. */
  estimatedValueCents?: number;
  /** Whether this result qualifies the listing for the Verified Shield. */
  shieldEligible: boolean;
  /** Simulated raw registry payload, stored as-is on the Verification record. */
  rawApiResponse: Record<string, unknown>;
  /** Simulated network latency, in milliseconds — useful for UI testing. */
  latencyMs: number;
}

export interface VerificationLookupInput {
  provider: VerificationProvider;
  certificateId: string;
}

const PROVIDER_LABELS: Record<VerificationProvider, string> = {
  SANGS: "South African Numismatic Grading Service",
  NGC: "Numismatic Guaranty Company",
  PCGS: "Professional Coin Grading Service",
  HERNS: "Hern's Handbook of South African Coins & Patterns",
};

const MIN_CERTIFICATE_ID_LENGTH = 4;
const MIN_LATENCY_MS = 350;
const MAX_LATENCY_MS = 950;

// ── Mock content pools ──────────────────────────────────────────────────

const SANGS_GRADES = [
  "AU55",
  "AU58",
  "MS60",
  "MS62",
  "MS63",
  "MS64",
  "MS65",
  "MS66",
  "MS67",
  "PF63",
  "PF65",
  "PF67",
  "PF69",
] as const;

const NGC_GRADES = [
  "MS 63",
  "MS 64",
  "MS 65",
  "MS 66",
  "MS 66 ★",
  "MS 67",
  "PF 67 UCAM",
  "PF 68 UCAM",
  "PF 69 UCAM",
  "PF 70 UCAM",
] as const;

const PCGS_GRADES = [
  "MS64",
  "MS65",
  "MS65+",
  "MS66",
  "MS66+",
  "MS67",
  "PR68DCAM",
  "PR69DCAM",
  "PR70DCAM",
] as const;

const HERNS_CATALOG_PREFIXES = ["H4", "H5", "H6", "H7", "H8"] as const;

const HISTORICAL_NOTE_TEMPLATES = [
  "Struck at the {mint} Mint during a period of limited mintage, making surviving examples in this grade scarce.",
  "Part of the {series} series, widely collected for its historical association with the Union of South Africa.",
  "One of an estimated {mintage} pieces struck this year; population reports show relatively few certified at this grade.",
  "Frequently referenced in South African numismatic literature as a key date for the {series} series.",
  "Shows the classic die characteristics documented for early strikes of this issue.",
] as const;

const MINTS = ["Pretoria", "South African Mint", "Royal Mint (London)", "Kimberley"] as const;
const SERIES = ["Kruger Pond", "Union Period", "Republic Series", "Protea", "Natura", "Krugerrand"] as const;

function formatTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

function buildHistoricalNotes(rng: () => number, mintage: number): string {
  const template = pick(rng, HISTORICAL_NOTE_TEMPLATES);
  return formatTemplate(template, {
    mint: pick(rng, MINTS),
    series: pick(rng, SERIES),
    mintage,
  });
}

function gradeValueMultiplier(grade: string): number {
  // Extract the leading numeric grade component (Sheldon-scale-ish) to bias
  // the mock valuation upward for higher grades. Falls back to a neutral
  // multiplier for non-numeric grades (e.g. Hern's catalog entries).
  const match = grade.match(/(\d{2})/);
  if (!match) return 1;
  const numeric = Number(match[1]);
  return Math.max(0.6, numeric / 45);
}

/**
 * A certificate is treated as "not found" if it's malformed, or — to
 * exercise that code path deterministically in tests/demos — if its hash
 * lands in a fixed ~1-in-13 bucket.
 */
function isNotFound(provider: VerificationProvider, certificateId: string): boolean {
  if (certificateId.trim().length < MIN_CERTIFICATE_ID_LENGTH) return true;
  const hash = hashString(`${provider}:${certificateId.trim().toUpperCase()}:not-found`);
  return hash % 13 === 0;
}

async function simulateLatency(rng: () => number): Promise<number> {
  const latencyMs = intBetween(rng, MIN_LATENCY_MS, MAX_LATENCY_MS);
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  return latencyMs;
}

async function lookupSangs(rng: () => number, certificateId: string): Promise<Omit<VerificationLookupResult, "provider" | "certificateId" | "found" | "latencyMs">> {
  const grade = pick(rng, SANGS_GRADES);
  const mintage = intBetween(rng, 500, 250_000);
  return {
    grade,
    mintage,
    historicalNotes: buildHistoricalNotes(rng, mintage),
    estimatedValueCents: Math.round(intBetween(rng, 40_000, 180_000) * gradeValueMultiplier(grade)),
    shieldEligible: true,
    rawApiResponse: {
      registry: PROVIDER_LABELS.SANGS,
      certNumber: certificateId,
      grade,
      mintage,
      status: "AUTHENTIC",
    },
  };
}

async function lookupNgc(rng: () => number, certificateId: string): Promise<Omit<VerificationLookupResult, "provider" | "certificateId" | "found" | "latencyMs">> {
  const grade = pick(rng, NGC_GRADES);
  const mintage = intBetween(rng, 1_000, 2_000_000);
  return {
    grade,
    mintage,
    historicalNotes: buildHistoricalNotes(rng, mintage),
    estimatedValueCents: Math.round(intBetween(rng, 60_000, 400_000) * gradeValueMultiplier(grade)),
    shieldEligible: true,
    rawApiResponse: {
      registry: PROVIDER_LABELS.NGC,
      certNumber: certificateId,
      grade,
      mintage,
      varietyPlus: false,
    },
  };
}

async function lookupPcgs(rng: () => number, certificateId: string): Promise<Omit<VerificationLookupResult, "provider" | "certificateId" | "found" | "latencyMs">> {
  const grade = pick(rng, PCGS_GRADES);
  const mintage = intBetween(rng, 1_000, 2_000_000);
  return {
    grade,
    mintage,
    historicalNotes: buildHistoricalNotes(rng, mintage),
    estimatedValueCents: Math.round(intBetween(rng, 60_000, 450_000) * gradeValueMultiplier(grade)),
    shieldEligible: true,
    rawApiResponse: {
      registry: PROVIDER_LABELS.PCGS,
      certNumber: certificateId,
      grade,
      mintage,
      pcgsNumber: intBetween(rng, 10000, 99999),
    },
  };
}

async function lookupHerns(rng: () => number, certificateId: string): Promise<Omit<VerificationLookupResult, "provider" | "certificateId" | "found" | "latencyMs">> {
  const catalogNumber = `${pick(rng, HERNS_CATALOG_PREFIXES)}.${intBetween(rng, 1, 40)}`;
  const mintage = intBetween(rng, 500, 5_000_000);
  const low = intBetween(rng, 20_000, 60_000);
  const high = Math.round(low * (1.4 + rng()));
  return {
    catalogNumber,
    mintage,
    historicalNotes: buildHistoricalNotes(rng, mintage),
    estimatedValueCents: Math.round((low + high) / 2),
    shieldEligible: true,
    rawApiResponse: {
      registry: PROVIDER_LABELS.HERNS,
      lookupReference: certificateId,
      catalogNumber,
      referenceRangeCents: { low, high },
      mintage,
    },
  };
}

/**
 * Looks up a certificate against the mocked external registry API.
 *
 * Never throws for a "not found" certificate — callers should check the
 * `found` field. Throws only for programmer errors (e.g. an unsupported
 * provider), which should never happen given the `VerificationProvider`
 * enum.
 */
export async function lookupCertificate({
  provider,
  certificateId,
}: VerificationLookupInput): Promise<VerificationLookupResult> {
  const trimmedId = certificateId.trim();
  const rng = mulberry32(hashString(`${provider}:${trimmedId.toUpperCase()}`));
  const latencyMs = await simulateLatency(rng);

  if (isNotFound(provider, trimmedId)) {
    return {
      provider,
      certificateId: trimmedId,
      found: false,
      shieldEligible: false,
      rawApiResponse: { registry: PROVIDER_LABELS[provider], certNumber: trimmedId, status: "NOT_FOUND" },
      latencyMs,
    };
  }

  let details: Omit<VerificationLookupResult, "provider" | "certificateId" | "found" | "latencyMs">;
  switch (provider) {
    case VerificationProvider.SANGS:
      details = await lookupSangs(rng, trimmedId);
      break;
    case VerificationProvider.NGC:
      details = await lookupNgc(rng, trimmedId);
      break;
    case VerificationProvider.PCGS:
      details = await lookupPcgs(rng, trimmedId);
      break;
    case VerificationProvider.HERNS:
      details = await lookupHerns(rng, trimmedId);
      break;
    default: {
      const unhandled: never = provider;
      throw new Error(`Unsupported verification provider: ${String(unhandled)}`);
    }
  }

  return {
    provider,
    certificateId: trimmedId,
    found: true,
    latencyMs,
    ...details,
  };
}

export function getProviderLabel(provider: VerificationProvider): string {
  return PROVIDER_LABELS[provider];
}

/**
 * Result type for the interactive certificate-check flow (see
 * `actions/verification.ts`). Kept here rather than in that "use server"
 * file — Next.js restricts Server Action modules to exporting only async
 * functions.
 */
export type CheckCertificateResult =
  | { ok: true; lookup: VerificationLookupResult; alreadyLocked: boolean }
  | { ok: false; error: string };
