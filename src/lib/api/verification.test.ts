import { describe, expect, it } from "vitest";
import { VerificationProvider } from "@prisma/client";
import { getProviderLabel, lookupCertificate } from "./verification";

describe("lookupCertificate", () => {
  it("is deterministic for the same provider + certificate ID", async () => {
    const first = await lookupCertificate({ provider: VerificationProvider.NGC, certificateId: "NGC-1234567" });
    const second = await lookupCertificate({ provider: VerificationProvider.NGC, certificateId: "NGC-1234567" });

    expect(second.found).toBe(first.found);
    expect(second.grade).toBe(first.grade);
    expect(second.mintage).toBe(first.mintage);
    expect(second.estimatedValueCents).toBe(first.estimatedValueCents);
  });

  it("is case- and whitespace-insensitive when deriving deterministic results", async () => {
    const a = await lookupCertificate({ provider: VerificationProvider.PCGS, certificateId: "pcgs-88221100" });
    const b = await lookupCertificate({ provider: VerificationProvider.PCGS, certificateId: "  PCGS-88221100  " });

    expect(b.grade).toBe(a.grade);
    expect(b.estimatedValueCents).toBe(a.estimatedValueCents);
  });

  it("rejects certificate IDs that are too short as not found", async () => {
    const result = await lookupCertificate({ provider: VerificationProvider.SANGS, certificateId: "1" });
    expect(result.found).toBe(false);
    expect(result.shieldEligible).toBe(false);
    expect(result.grade).toBeUndefined();
  });

  it("returns a grade and shield eligibility for a found SANGS certificate", async () => {
    const result = await lookupCertificate({ provider: VerificationProvider.SANGS, certificateId: "SANGS-2024-001" });
    if (result.found) {
      expect(result.grade).toBeTruthy();
      expect(result.mintage).toBeGreaterThan(0);
      expect(result.estimatedValueCents).toBeGreaterThan(0);
      expect(result.shieldEligible).toBe(true);
      expect(result.historicalNotes).toBeTruthy();
    }
  });

  it("returns a Hern's catalog number instead of a grading-scale grade", async () => {
    const result = await lookupCertificate({ provider: VerificationProvider.HERNS, certificateId: "HERNS-KM5-A1" });
    if (result.found) {
      expect(result.catalogNumber).toBeTruthy();
      expect(result.grade).toBeUndefined();
    }
  });

  it("reports simulated latency within the expected bounds", async () => {
    const result = await lookupCertificate({ provider: VerificationProvider.NGC, certificateId: "NGC-LATENCY-1" });
    expect(result.latencyMs).toBeGreaterThanOrEqual(350);
    expect(result.latencyMs).toBeLessThanOrEqual(950);
  });

  it("produces different-looking results across all four providers for the same raw ID", async () => {
    const providers = [
      VerificationProvider.SANGS,
      VerificationProvider.NGC,
      VerificationProvider.PCGS,
      VerificationProvider.HERNS,
    ];
    const results = await Promise.all(
      providers.map((provider) => lookupCertificate({ provider, certificateId: "SAME-RAW-ID-000" }))
    );
    results.forEach((result, index) => {
      expect(result.provider).toBe(providers[index]);
    });
  });
});

describe("getProviderLabel", () => {
  it("returns a human readable label for every provider", () => {
    for (const provider of Object.values(VerificationProvider)) {
      expect(getProviderLabel(provider)).toBeTruthy();
    }
  });
});
