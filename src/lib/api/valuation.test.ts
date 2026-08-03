import { describe, expect, it } from "vitest";
import { getHernsCatalogMetrics, getMintedValuationHistory } from "./valuation";

describe("getMintedValuationHistory", () => {
  it("is deterministic for the same seed key and price", () => {
    const a = getMintedValuationHistory("NGC-123", 250_000);
    const b = getMintedValuationHistory("NGC-123", 250_000);
    expect(b).toEqual(a);
  });

  it("ends exactly at the current asking price", () => {
    const history = getMintedValuationHistory("SEED-A", 500_000);
    expect(history.points.at(-1)?.realizedPriceCents).toBe(500_000);
  });

  it("produces 13 quarterly points (3 years + current quarter)", () => {
    const history = getMintedValuationHistory("SEED-B", 100_000);
    expect(history.points).toHaveLength(13);
  });

  it("varies with a different seed key", () => {
    const a = getMintedValuationHistory("SEED-C", 250_000);
    const b = getMintedValuationHistory("SEED-D", 250_000);
    expect(a.points[0].realizedPriceCents).not.toBe(b.points[0].realizedPriceCents);
  });
});

describe("getHernsCatalogMetrics", () => {
  it("is deterministic for the same seed key and price", () => {
    const a = getHernsCatalogMetrics("PCGS-456", 180_000);
    const b = getHernsCatalogMetrics("PCGS-456", 180_000);
    expect(b).toEqual(a);
  });

  it("returns a plausible catalog number and rarity rating", () => {
    const metrics = getHernsCatalogMetrics("SEED-E", 90_000);
    expect(metrics.catalogNumber).toMatch(/^H[4-8]\.\d+$/);
    expect(metrics.referenceValueCents).toBeGreaterThan(0);
  });
});
