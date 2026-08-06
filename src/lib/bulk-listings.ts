import { ListingCategory, ListingType, PreciousMetal, VerificationProvider } from "@prisma/client";

import { randsToCents } from "@/lib/utils/currency";
import type { CreateListingInput } from "@/lib/validation/listing";

/**
 * Dealer bulk CSV inventory import — parse, validate, and map rows into createListing inputs.
 *
 * Expected header (case-insensitive, order-flexible):
 * title, description, category, listingType, metal, priceRands, year, denomination,
 * condition, weightGrams, coverImageUrl, obverseImageUrl, reverseImageUrl, slabImageUrl,
 * certificateId, verificationProvider
 */

export const BULK_CSV_HEADERS = [
  "title",
  "description",
  "category",
  "listingType",
  "metal",
  "priceRands",
  "year",
  "denomination",
  "condition",
  "weightGrams",
  "coverImageUrl",
  "obverseImageUrl",
  "reverseImageUrl",
  "slabImageUrl",
  "certificateId",
  "verificationProvider",
] as const;

export type BulkCsvHeader = (typeof BULK_CSV_HEADERS)[number];

export type BulkCsvRowError = { row: number; message: string };

export type BulkCsvParseResult = {
  rows: CreateListingInput[];
  errors: BulkCsvRowError[];
  skipped: number;
};

const CATEGORY_ALIASES: Record<string, ListingCategory> = {
  coins: ListingCategory.COINS,
  coin: ListingCategory.COINS,
  banknotes: ListingCategory.BANKNOTES,
  banknote: ListingCategory.BANKNOTES,
  bullion: ListingCategory.BULLION,
  krugerrand: ListingCategory.KRUGERRAND,
  krugerrands: ListingCategory.KRUGERRAND,
  medallions_tokens: ListingCategory.MEDALLIONS_TOKENS,
  medallions: ListingCategory.MEDALLIONS_TOKENS,
  accessories: ListingCategory.ACCESSORIES,
  other: ListingCategory.OTHER,
};

const LISTING_TYPE_ALIASES: Record<string, ListingType> = {
  raw: ListingType.RAW,
  graded: ListingType.GRADED,
  bullion: ListingType.BULLION,
};

const METAL_ALIASES: Record<string, PreciousMetal> = {
  gold: PreciousMetal.GOLD,
  silver: PreciousMetal.SILVER,
  platinum: PreciousMetal.PLATINUM,
  copper: PreciousMetal.COPPER,
  bronze: PreciousMetal.BRONZE,
  nickel: PreciousMetal.NICKEL,
  steel: PreciousMetal.STEEL,
  not_applicable: PreciousMetal.NOT_APPLICABLE,
  na: PreciousMetal.NOT_APPLICABLE,
  none: PreciousMetal.NOT_APPLICABLE,
};

const PROVIDER_ALIASES: Record<string, VerificationProvider> = {
  sangs: VerificationProvider.SANGS,
  ngc: VerificationProvider.NGC,
  pcgs: VerificationProvider.PCGS,
  anacs: VerificationProvider.ANACS,
  sa_mint: VerificationProvider.SA_MINT,
  "sa mint": VerificationProvider.SA_MINT,
  herns: VerificationProvider.HERNS,
};

/** Minimal RFC4180-ish CSV line splitter (supports quoted commas). */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "");
}

const HEADER_ALIASES: Record<string, BulkCsvHeader> = {
  title: "title",
  description: "description",
  desc: "description",
  category: "category",
  listingtype: "listingType",
  type: "listingType",
  metal: "metal",
  pricerands: "priceRands",
  price: "priceRands",
  pricezar: "priceRands",
  year: "year",
  denomination: "denomination",
  condition: "condition",
  grade: "condition",
  weightgrams: "weightGrams",
  weight: "weightGrams",
  coverimageurl: "coverImageUrl",
  cover: "coverImageUrl",
  coverurl: "coverImageUrl",
  obverseimageurl: "obverseImageUrl",
  obverse: "obverseImageUrl",
  reverseimageurl: "reverseImageUrl",
  reverse: "reverseImageUrl",
  slabimageurl: "slabImageUrl",
  slab: "slabImageUrl",
  certificateimageurl: "slabImageUrl",
  certificateid: "certificateId",
  slabserial: "certificateId",
  verificationprovider: "verificationProvider",
  provider: "verificationProvider",
  grader: "verificationProvider",
};

function parseEnum<T extends string>(
  raw: string | undefined,
  aliases: Record<string, T>,
  fallback: T,
): T {
  if (!raw?.trim()) return fallback;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return aliases[key] ?? aliases[raw.trim().toLowerCase()] ?? fallback;
}

function optionalHttpUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (!/^https?:\/\//i.test(value)) return undefined;
  return value;
}

export function parseBulkListingsCsv(csvText: string): BulkCsvParseResult {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "CSV file is empty." }], skipped: 0 };
  }

  const headerCells = splitCsvLine(lines[0]).map(normalizeHeader);
  const columnMap = new Map<number, BulkCsvHeader>();
  for (let i = 0; i < headerCells.length; i++) {
    const mapped = HEADER_ALIASES[headerCells[i]];
    if (mapped) columnMap.set(i, mapped);
  }

  if (![...columnMap.values()].includes("title") || ![...columnMap.values()].includes("priceRands")) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: "CSV must include at least `title` and `priceRands` (or `price`) columns.",
        },
      ],
      skipped: 0,
    };
  }

  const rows: CreateListingInput[] = [];
  const errors: BulkCsvRowError[] = [];
  let skipped = 0;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const rowNumber = lineIndex + 1;
    const cells = splitCsvLine(lines[lineIndex]);
    const record: Partial<Record<BulkCsvHeader, string>> = {};
    for (const [index, header] of columnMap.entries()) {
      record[header] = cells[index] ?? "";
    }

    const title = record.title?.trim() ?? "";
    if (!title) {
      skipped += 1;
      continue;
    }

    const priceRaw = record.priceRands?.trim() ?? "";
    const priceRands = Number.parseFloat(priceRaw.replace(/[R\s,]/g, ""));
    if (!Number.isFinite(priceRands) || priceRands <= 0) {
      errors.push({ row: rowNumber, message: `Invalid price "${priceRaw}".` });
      continue;
    }

    const listingType = parseEnum(record.listingType, LISTING_TYPE_ALIASES, ListingType.RAW);
    const category = parseEnum(record.category, CATEGORY_ALIASES, ListingCategory.COINS);
    const metal = parseEnum(record.metal, METAL_ALIASES, PreciousMetal.NOT_APPLICABLE);

    const coverImageUrl = optionalHttpUrl(record.coverImageUrl);
    const obverseImageUrl = optionalHttpUrl(record.obverseImageUrl);
    const reverseImageUrl = optionalHttpUrl(record.reverseImageUrl);
    const certificateImageUrl = optionalHttpUrl(record.slabImageUrl);
    const images = [coverImageUrl, obverseImageUrl, reverseImageUrl, certificateImageUrl].filter(
      (url): url is string => Boolean(url),
    );

    if (images.length === 0) {
      errors.push({
        row: rowNumber,
        message: "At least one image URL (cover/obverse/reverse/slab) is required.",
      });
      continue;
    }

    const description =
      record.description?.trim() ||
      `${title} — dealer bulk inventory listing on MintMark.`;

    const yearRaw = record.year?.trim();
    const year = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;
    const weightRaw = record.weightGrams?.trim();
    const weightGrams = weightRaw ? Number.parseFloat(weightRaw) : undefined;

    const certificateId = record.certificateId?.trim() || undefined;
    const providerRaw = record.verificationProvider?.trim();
    const verificationProvider = providerRaw
      ? parseEnum(providerRaw, PROVIDER_ALIASES, VerificationProvider.NGC)
      : undefined;

    if (listingType === ListingType.GRADED && (!certificateId || !providerRaw)) {
      errors.push({
        row: rowNumber,
        message: "Graded rows require certificateId and verificationProvider.",
      });
      continue;
    }

    rows.push({
      title,
      description: description.length >= 10 ? description : `${description} Listed via bulk CSV.`,
      category,
      listingType,
      metal,
      condition: record.condition?.trim() || undefined,
      year: Number.isFinite(year) ? year : undefined,
      denomination: record.denomination?.trim() || undefined,
      weightGrams: Number.isFinite(weightGrams) && (weightGrams as number) > 0 ? weightGrams : undefined,
      priceCents: randsToCents(priceRands),
      acceptsOffers: true,
      saleFormat: "FIXED",
      images,
      coverImageUrl: coverImageUrl || "",
      obverseImageUrl: obverseImageUrl || "",
      reverseImageUrl: reverseImageUrl || "",
      certificateImageUrl: certificateImageUrl || "",
      certificateId: listingType === ListingType.GRADED ? certificateId : undefined,
      verificationProvider: listingType === ListingType.GRADED ? verificationProvider : undefined,
    });
  }

  return { rows, errors, skipped };
}

export function buildBulkCsvTemplate(): string {
  const header = BULK_CSV_HEADERS.join(",");
  const example = [
    `"1967 Silver Rand MS65"`,
    `"Beautiful toned RSA Silver Rand."`,
    `COINS`,
    `GRADED`,
    `SILVER`,
    `4500`,
    `1967`,
    `1 Rand`,
    `MS-65`,
    `15.0`,
    `https://picsum.photos/seed/bulk-cover/800/800`,
    `https://picsum.photos/seed/bulk-obv/800/800`,
    `https://picsum.photos/seed/bulk-rev/800/800`,
    ``,
    `NGC1234567-001`,
    `NGC`,
  ].join(",");
  return `${header}\n${example}\n`;
}
