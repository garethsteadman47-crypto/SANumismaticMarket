import { describe, expect, it } from "vitest";
import { createListingSchema } from "./listing";

const BASE_RAW_INPUT = {
  title: "Test Coin Listing",
  description: "A test listing created to verify the form submission bug fix works correctly.",
  category: "COINS",
  listingType: "RAW",
  metal: "NOT_APPLICABLE",
  priceCents: 150_000,
  images: ["https://picsum.photos/id/1020/800/800"],
};

describe("createListingSchema", () => {
  it("accepts a minimal RAW listing", () => {
    const result = createListingSchema.safeParse(BASE_RAW_INPUT);
    expect(result.success).toBe(true);
  });

  it("treats blank optional number fields (as submitted by an empty <input>) as absent, not 0", () => {
    const result = createListingSchema.safeParse({
      ...BASE_RAW_INPUT,
      year: "",
      weightGrams: "",
      purityPercent: "",
      mintage: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBeUndefined();
      expect(result.data.weightGrams).toBeUndefined();
      expect(result.data.purityPercent).toBeUndefined();
      expect(result.data.mintage).toBeUndefined();
    }
  });

  it("still enforces bounds when an optional number field is actually provided", () => {
    const result = createListingSchema.safeParse({ ...BASE_RAW_INPUT, year: "1500" });
    expect(result.success).toBe(false);
  });

  it("coerces a valid numeric string for an optional field", () => {
    const result = createListingSchema.safeParse({ ...BASE_RAW_INPUT, year: "2020" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2020);
    }
  });

  it("tolerates a stray empty-string certificateId/verificationProvider on a RAW listing (RHF doesn't unregister unmounted fields)", () => {
    const result = createListingSchema.safeParse({
      ...BASE_RAW_INPUT,
      certificateId: "",
      verificationProvider: "",
    });
    expect(result.success).toBe(true);
  });

  it("requires certificateId and verificationProvider for a GRADED listing", () => {
    const result = createListingSchema.safeParse({
      ...BASE_RAW_INPUT,
      listingType: "GRADED",
      certificateId: "",
      verificationProvider: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("certificateId");
      expect(paths).toContain("verificationProvider");
    }
  });

  it("accepts a fully specified GRADED listing", () => {
    const result = createListingSchema.safeParse({
      ...BASE_RAW_INPUT,
      listingType: "GRADED",
      certificateId: "NGC-1234567",
      verificationProvider: "NGC",
    });
    expect(result.success).toBe(true);
  });

  it("accepts data:image base64 photos from device uploads", () => {
    const result = createListingSchema.safeParse({
      ...BASE_RAW_INPUT,
      images: ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"],
      coverImageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD",
    });
    expect(result.success).toBe(true);
  });

  it("rejects blob: object URLs which cannot be persisted", () => {
    const result = createListingSchema.safeParse({
      ...BASE_RAW_INPUT,
      images: ["blob:http://localhost/abc"],
    });
    expect(result.success).toBe(false);
  });
});
