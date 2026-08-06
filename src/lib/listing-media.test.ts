import { describe, expect, it } from "vitest";

import { createEmptyListingMedia, resolvePublishableSlotUrl } from "./listing-media";
import {
  buildBulkCsvTemplate,
  parseBulkCsvToDraftRows,
  parseBulkListingsCsv,
  splitCsvLine,
} from "./bulk-listings";
import { autoMatchPhotosToRows } from "./bulk-photo-match";

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

describe("bulk-listings CSV metadata", () => {
  it("splits quoted CSV cells", () => {
    expect(splitCsvLine(`"A, B",COINS,100`)).toEqual(["A, B", "COINS", "100"]);
  });

  it("parses metadata-only inventory rows without image URLs", () => {
    const csv = [
      "title,description,category,price,grade,gradingService,certNumber",
      `"Silver Rand","A nice coin for collectors.",COINS,1200,MS-65,RAW,`,
    ].join("\n");

    const drafted = parseBulkCsvToDraftRows(csv);
    expect(drafted.fatalError).toBeUndefined();
    expect(drafted.rows).toHaveLength(1);
    expect(drafted.rows[0].title).toBe("Silver Rand");
    expect(drafted.rows[0].priceRands).toBe("1200");
    expect(drafted.rows[0].condition).toBe("MS-65");
    expect(drafted.rows[0].media.obverse).toBeNull();
    expect(drafted.rows[0].warnings.some((w) => /Obverse/i.test(w))).toBe(true);

    const legacy = parseBulkListingsCsv(csv);
    expect(legacy.errors).toEqual([]);
    expect(legacy.rows).toHaveLength(1);
    expect(legacy.rows[0].title).toBe("Silver Rand");
    expect(legacy.rows[0].priceCents).toBe(120_000);
  });

  it("rejects graded rows missing certificate fields", () => {
    const csv = [
      "title,category,price,grade,gradingService",
      `Graded Pond,COINS,5000,MS-65,NGC`,
    ].join("\n");
    const drafted = parseBulkCsvToDraftRows(csv);
    expect(drafted.rows[0].fieldErrors.certificateId).toMatch(/Cert number/i);
  });

  it("builds a metadata-only template", () => {
    const template = buildBulkCsvTemplate();
    expect(template).toContain("title,description,category,price,grade,gradingService,certNumber");
    expect(template).not.toMatch(/imageUrl/i);
  });
});

describe("bulk photo auto-match", () => {
  it("assigns photos by row index and slot keywords", () => {
    const csv = [
      "title,category,price,gradingService",
      `Silver Rand,COINS,1200,RAW`,
      `Gold Pond,COINS,9000,RAW`,
    ].join("\n");
    const { rows } = parseBulkCsvToDraftRows(csv);
    const pool = [
      { id: "a", name: "row2_front.jpg", previewUrl: "blob:a" },
      { id: "b", name: "row2_rev.jpg", previewUrl: "blob:b" },
      { id: "c", name: "unrelated.png", previewUrl: "blob:c" },
    ];

    const result = autoMatchPhotosToRows(rows, pool);
    expect(result.assignedCount).toBeGreaterThanOrEqual(2);
    // row2_* maps to the second draft item (1-based index), not CSV line number.
    const second = result.rows[1];
    expect(second.media.obverse?.name).toMatch(/front/i);
    expect(second.media.reverse?.name).toMatch(/rev/i);
    expect(result.remainingPool.some((item) => item.name === "unrelated.png")).toBe(true);
  });

  it("matches cert numbers in filenames", () => {
    const csv = [
      "title,category,price,gradingService,certNumber",
      `Graded Rand,COINS,4500,NGC,NGC88231`,
    ].join("\n");
    const { rows } = parseBulkCsvToDraftRows(csv);
    const pool = [
      { id: "a", name: "NGC88231_obv.jpg", previewUrl: "blob:a" },
      { id: "b", name: "NGC88231_rev.jpg", previewUrl: "blob:b" },
    ];
    const result = autoMatchPhotosToRows(rows, pool);
    expect(result.rows[0].media.obverse?.id).toBe("a");
    expect(result.rows[0].media.reverse?.id).toBe("b");
    expect(result.remainingPool).toHaveLength(0);
  });
});
