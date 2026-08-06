import { describe, expect, it } from "vitest";

import { createEmptyListingMedia, resolvePublishableSlotUrl } from "./listing-media";
import { parseBulkListingsCsv, splitCsvLine } from "./bulk-listings";

describe("listing-media slots", () => {
  it("keeps independent slot objects (no shared array indices)", () => {
    const media = createEmptyListingMedia();
    media.cover = {
      file: null,
      previewUrl: "blob:cover",
      remoteUrl: null,
    };
    media.obverse = {
      file: null,
      previewUrl: "https://example.com/obverse.jpg",
      remoteUrl: "https://example.com/obverse.jpg",
    };

    expect(media.cover.previewUrl).toBe("blob:cover");
    expect(media.obverse.remoteUrl).toContain("obverse");
    expect(media.reverse.previewUrl).toBeNull();
  });

  it("prefers remote HTTPS over blob placeholders when publishing", () => {
    const url = resolvePublishableSlotUrl(
      { file: null, previewUrl: "blob:x", remoteUrl: "https://cdn.example/cover.jpg" },
      (seed) => `https://placeholder/${seed}`,
      "seed",
    );
    expect(url).toBe("https://cdn.example/cover.jpg");
  });
});

describe("bulk-listings CSV", () => {
  it("splits quoted CSV cells", () => {
    expect(splitCsvLine(`"A, B",COINS,100`)).toEqual(["A, B", "COINS", "100"]);
  });

  it("parses a valid inventory row", () => {
    const csv = [
      "title,description,category,listingType,metal,priceRands,coverImageUrl,obverseImageUrl,gradingCompany",
      `"Silver Rand","A nice coin for collectors.",COINS,RAW,SILVER,1200,https://example.com/c.jpg,https://example.com/o.jpg,RAW`,
    ].join("\n");

    const result = parseBulkListingsCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe("Silver Rand");
    expect(result.rows[0].priceCents).toBe(120_000);
    expect(result.rows[0].coverImageUrl).toContain("example.com/c");
  });

  it("rejects graded rows missing certificate fields", () => {
    const csv = [
      "title,category,priceRands,listingType,gradingCompany,coverImageUrl",
      `Graded Pond,COINS,5000,GRADED,NGC,https://example.com/c.jpg`,
    ].join("\n");
    const result = parseBulkListingsCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.message).toMatch(/Slab serial|certificate/i);
  });
});
