"use server";

import { BulkImportStatus, SubscriptionTier } from "@prisma/client";

import { auth } from "@/lib/auth";
import { parseBulkListingsCsv } from "@/lib/bulk-listings";
import { db } from "@/lib/db";
import { createListing } from "@/lib/listings";

export type BulkImportActionResult =
  | {
      success: true;
      importId: string;
      totalRows: number;
      successCount: number;
      errorCount: number;
      errors: { row: number; message: string }[];
      listingIds: string[];
    }
  | { success: false; error: string };

const MAX_BULK_ROWS = 100;

/**
 * Dealer-only bulk CSV inventory import. Parses the CSV, creates fixed-price
 * listings row-by-row, and records a BulkListingImport audit row.
 */
export async function importBulkListingsCsvAction(
  csvText: string,
  filename?: string,
): Promise<BulkImportActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to import inventory." };
  }

  const seller = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, subscriptionTier: true, isSaandDealer: true },
  });

  if (!seller) {
    return { success: false, error: "Seller account not found." };
  }

  const canBulkImport =
    seller.subscriptionTier === SubscriptionTier.DEALER ||
    seller.subscriptionTier === SubscriptionTier.GOLD ||
    seller.isSaandDealer;

  if (!canBulkImport) {
    return {
      success: false,
      error: "Bulk CSV import is available for Dealer and Gold members.",
    };
  }

  const parsed = parseBulkListingsCsv(csvText);
  if (parsed.rows.length === 0 && parsed.errors.length > 0) {
    return { success: false, error: parsed.errors[0]?.message ?? "Could not parse CSV." };
  }

  if (parsed.rows.length > MAX_BULK_ROWS) {
    return {
      success: false,
      error: `CSV has ${parsed.rows.length} valid rows — maximum is ${MAX_BULK_ROWS} per upload.`,
    };
  }

  const importRecord = await db.bulkListingImport.create({
    data: {
      sellerId: seller.id,
      filename: filename?.slice(0, 200) || null,
      status: BulkImportStatus.PENDING,
      totalRows: parsed.rows.length,
      successCount: 0,
      errorCount: parsed.errors.length,
      errors: parsed.errors,
    },
  });

  const listingIds: string[] = [];
  const runtimeErrors = [...parsed.errors];

  for (let i = 0; i < parsed.rows.length; i++) {
    const input = parsed.rows[i];
    const result = await createListing(seller.id, input);
    if (!result.success) {
      runtimeErrors.push({
        row: i + 2,
        message: result.error,
      });
      continue;
    }
    listingIds.push(result.listingId);
  }

  const successCount = listingIds.length;
  const errorCount = runtimeErrors.length;

  await db.bulkListingImport.update({
    where: { id: importRecord.id },
    data: {
      status: successCount > 0 ? BulkImportStatus.COMPLETED : BulkImportStatus.FAILED,
      successCount,
      errorCount,
      errors: runtimeErrors.slice(0, 100),
    },
  });

  return {
    success: true,
    importId: importRecord.id,
    totalRows: parsed.rows.length,
    successCount,
    errorCount,
    errors: runtimeErrors.slice(0, 50),
    listingIds,
  };
}
