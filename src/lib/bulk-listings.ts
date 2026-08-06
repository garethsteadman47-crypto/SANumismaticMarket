import { ListingCategory, ListingType, PreciousMetal, VerificationProvider } from "@prisma/client";

import { randsToCents } from "@/lib/utils/currency";
import type { CreateListingInput } from "@/lib/validation/listing";

/**
 * Dealer bulk CSV inventory import — parse, validate, and map rows into createListing inputs.
 *
 * Expected header (case-insensitive, order-flexible):
 * title, description, category, listingType, metal, priceRands, year, denomination,
 * condition, weightGrams, coverImageUrl, obverseImageUrl, reverseImageUrl, slabImageUrl,
 * certificateId, verificationProvider / gradingCompany (NGC|PCGS|SANGS|RAW)
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
  "gradingCompany",
] as const;

export type BulkCsvHeader = (typeof BULK_CSV_HEADERS)[number];

export type BulkCsvRowError = { row: number; message: string };

export type BulkCsvParseResult = {
  rows: CreateListingInput[];
  errors: BulkCsvRowError[];
  skipped: number;
};

/** Allowed grading companies in the interactive bulk wizard. */
export const BULK_GRADING_COMPANIES = ["NGC", "PCGS", "SANGS", "RAW"] as const;
export type BulkGradingCompany = (typeof BULK_GRADING_COMPANIES)[number];

export type BulkDraftRow = {
  id: string;
  sourceRow: number;
  title: string;
  description: string;
  category: string;
  listingType: string;
  metal: string;
  priceRands: string;
  year: string;
  denomination: string;
  condition: string;
  weightGrams: string;
  coverImageUrl: string;
  obverseImageUrl: string;
  reverseImageUrl: string;
  slabImageUrl: string;
  certificateId: string;
  gradingCompany: string;
  fieldErrors: Partial<Record<BulkCsvHeader, string>>;
  warnings: string[];
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
  verificationprovider: "gradingCompany",
  gradingcompany: "gradingCompany",
  grader: "gradingCompany",
  provider: "gradingCompany",
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
  if (
    !/^https?:\/\//i.test(value) &&
    !value.startsWith("blob:") &&
    !/^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(value)
  ) {
    return undefined;
  }
  return value;
}

function normalizeGradingCompany(raw: string | undefined): BulkGradingCompany | "" {
  if (!raw?.trim()) return "";
  const upper = raw.trim().toUpperCase();
  if ((BULK_GRADING_COMPANIES as readonly string[]).includes(upper)) {
    return upper as BulkGradingCompany;
  }
  return "";
}

export function validateBulkDraftRow(row: BulkDraftRow): BulkDraftRow {
  const fieldErrors: Partial<Record<BulkCsvHeader, string>> = {};
  const warnings: string[] = [];

  if (!row.title.trim()) fieldErrors.title = "Title is required.";
  if (!row.category.trim()) {
    fieldErrors.category = "Category is required.";
  } else {
    const normalized = row.category.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const upper = row.category.trim().toUpperCase().replace(/\s+/g, "_");
    const known =
      Boolean(CATEGORY_ALIASES[normalized]) ||
      (Object.values(ListingCategory) as string[]).includes(upper);
    if (!known) fieldErrors.category = "Unknown category.";
  }

  const priceRands = Number.parseFloat(row.priceRands.replace(/[R\s,]/g, ""));
  if (!row.priceRands.trim() || !Number.isFinite(priceRands) || priceRands <= 0) {
    fieldErrors.priceRands = "Valid price is required.";
  }

  const grading = normalizeGradingCompany(row.gradingCompany);
  if (row.gradingCompany.trim() && !grading) {
    fieldErrors.gradingCompany = "Must be NGC, PCGS, SANGS, or RAW.";
  }

  if (grading && grading !== "RAW" && !row.certificateId.trim()) {
    fieldErrors.certificateId = "Slab serial required for graded coins.";
  }

  const hasImage = Boolean(
    optionalHttpUrl(row.coverImageUrl) ||
      optionalHttpUrl(row.obverseImageUrl) ||
      optionalHttpUrl(row.reverseImageUrl) ||
      optionalHttpUrl(row.slabImageUrl),
  );
  if (!hasImage) {
    warnings.push("Missing photos — upload or paste an image URL.");
  }

  return { ...row, fieldErrors, warnings };
}

export function isBulkDraftRowValid(row: BulkDraftRow): boolean {
  return Object.keys(row.fieldErrors).length === 0;
}

export function parseBulkCsvToDraftRows(csvText: string): { rows: BulkDraftRow[]; fatalError?: string } {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], fatalError: "CSV file is empty." };
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
      fatalError: "CSV must include at least `title` and `priceRands` (or `price`) columns.",
    };
  }

  const rows: BulkDraftRow[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const cells = splitCsvLine(lines[lineIndex]);
    if (cells.every((cell) => !cell.trim())) continue;

    const record: Partial<Record<BulkCsvHeader, string>> = {};
    for (const [index, header] of columnMap.entries()) {
      record[header] = cells[index] ?? "";
    }

    const draft = validateBulkDraftRow({
      id: `row-${lineIndex + 1}-${Math.random().toString(36).slice(2, 8)}`,
      sourceRow: lineIndex + 1,
      title: record.title ?? "",
      description: record.description ?? "",
      category: record.category ?? "",
      listingType: record.listingType ?? "",
      metal: record.metal ?? "",
      priceRands: record.priceRands ?? "",
      year: record.year ?? "",
      denomination: record.denomination ?? "",
      condition: record.condition ?? "",
      weightGrams: record.weightGrams ?? "",
      coverImageUrl: record.coverImageUrl ?? "",
      obverseImageUrl: record.obverseImageUrl ?? "",
      reverseImageUrl: record.reverseImageUrl ?? "",
      slabImageUrl: record.slabImageUrl ?? "",
      certificateId: record.certificateId ?? "",
      gradingCompany: record.gradingCompany ?? "",
      fieldErrors: {},
      warnings: [],
    });
    rows.push(draft);
  }

  return { rows };
}

export function draftRowToCreateListingInput(row: BulkDraftRow): CreateListingInput | { error: string } {
  const validated = validateBulkDraftRow(row);
  if (!isBulkDraftRowValid(validated)) {
    const first = Object.values(validated.fieldErrors)[0];
    return { error: first || "Row has validation errors." };
  }

  const title = row.title.trim();
  const priceRands = Number.parseFloat(row.priceRands.replace(/[R\s,]/g, ""));
  const grading = normalizeGradingCompany(row.gradingCompany);
  const listingTypeFromCol = parseEnum(row.listingType, LISTING_TYPE_ALIASES, ListingType.RAW);
  const listingType =
    grading === "RAW" || !grading
      ? listingTypeFromCol === ListingType.GRADED
        ? ListingType.RAW
        : listingTypeFromCol
      : ListingType.GRADED;

  const categoryUpper = row.category.trim().toUpperCase().replace(/\s+/g, "_");
  const category =
    (Object.values(ListingCategory) as string[]).includes(categoryUpper)
      ? (categoryUpper as ListingCategory)
      : parseEnum(row.category, CATEGORY_ALIASES, ListingCategory.COINS);

  const metal = parseEnum(row.metal, METAL_ALIASES, PreciousMetal.NOT_APPLICABLE);

  const coverImageUrl = optionalHttpUrl(row.coverImageUrl);
  const obverseImageUrl = optionalHttpUrl(row.obverseImageUrl);
  const reverseImageUrl = optionalHttpUrl(row.reverseImageUrl);
  const certificateImageUrl = optionalHttpUrl(row.slabImageUrl);

  // Prefer durable sources only — never invent stock/placeholder images.
  // blob: object URLs from the browser cannot be saved to MongoDB.
  const publishable = (url: string | undefined) => {
    if (!url) return undefined;
    if (url.startsWith("blob:")) return undefined;
    if (/^https?:\/\//i.test(url) || /^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(url)) return url;
    return undefined;
  };

  const cover = publishable(coverImageUrl);
  const obverse = publishable(obverseImageUrl);
  const reverse = publishable(reverseImageUrl);
  const slab = publishable(certificateImageUrl);
  const images = [cover, obverse, reverse, slab].filter((url): url is string => Boolean(url));

  if (images.length === 0) {
    return { error: "Add at least one durable image URL (or upload a photo) before publishing." };
  }

  const description =
    row.description.trim() || `${title} — dealer bulk inventory listing on MintMark.`;

  const year = row.year.trim() ? Number.parseInt(row.year, 10) : undefined;
  const weightGrams = row.weightGrams.trim() ? Number.parseFloat(row.weightGrams) : undefined;

  const verificationProvider =
    grading && grading !== "RAW" ? PROVIDER_ALIASES[grading.toLowerCase()] : undefined;

  return {
    title,
    description: description.length >= 10 ? description : `${description} Listed via bulk CSV.`,
    category,
    listingType,
    metal,
    condition: row.condition.trim() || undefined,
    year: Number.isFinite(year) ? year : undefined,
    denomination: row.denomination.trim() || undefined,
    weightGrams: Number.isFinite(weightGrams) && (weightGrams as number) > 0 ? weightGrams : undefined,
    priceCents: randsToCents(priceRands),
    acceptsOffers: true,
    saleFormat: "FIXED",
    images,
    coverImageUrl: cover || "",
    obverseImageUrl: obverse || "",
    reverseImageUrl: reverse || "",
    certificateImageUrl: slab || "",
    certificateId: listingType === ListingType.GRADED ? row.certificateId.trim() : undefined,
    verificationProvider: listingType === ListingType.GRADED ? verificationProvider : undefined,
  };
}

/** Legacy path used by the sales bulk action — maps CSV straight to createListing inputs. */
export function parseBulkListingsCsv(csvText: string): BulkCsvParseResult {
  const drafted = parseBulkCsvToDraftRows(csvText);
  if (drafted.fatalError) {
    return { rows: [], errors: [{ row: 1, message: drafted.fatalError }], skipped: 0 };
  }

  const rows: CreateListingInput[] = [];
  const errors: BulkCsvRowError[] = [];
  let skipped = 0;

  for (const draft of drafted.rows) {
    if (!draft.title.trim()) {
      skipped += 1;
      continue;
    }
    const mapped = draftRowToCreateListingInput(draft);
    if ("error" in mapped) {
      errors.push({ row: draft.sourceRow, message: mapped.error });
      continue;
    }
    rows.push(mapped);
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
    `https://example.com/cover.jpg`,
    `https://example.com/obverse.jpg`,
    `https://example.com/reverse.jpg`,
    ``,
    `NGC1234567-001`,
    `NGC`,
  ].join(",");
  return `${header}\n${example}\n`;
}
