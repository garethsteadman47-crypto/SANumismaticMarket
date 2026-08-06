import { BulkImportStatus, SubscriptionTier } from "@prisma/client";

import { draftRowToCreateListingInput, type BulkDraftRow } from "@/lib/bulk-listings";
import { createListing } from "@/lib/listings";
import { db } from "@/lib/db";
import { jsonCreated, jsonError, isNextResponse } from "@/lib/api/http";
import { requireApiUser } from "@/lib/api/require-user";

export const dynamic = "force-dynamic";

const MAX_BULK_ROWS = 100;

/**
 * POST /api/listings/bulk — publish validated draft rows from the BulkUploadWizard.
 * Body: `{ filename?: string, rows: BulkDraftRow[] }`
 */
export async function POST(request: Request) {
  const user = await requireApiUser();
  if (isNextResponse(user)) return user;

  const seller = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, subscriptionTier: true, isSaandDealer: true },
  });
  if (!seller) {
    return jsonError("Seller account not found.", 404);
  }

  const canBulkImport =
    seller.subscriptionTier === SubscriptionTier.DEALER ||
    seller.subscriptionTier === SubscriptionTier.GOLD ||
    seller.isSaandDealer;

  if (!canBulkImport) {
    return jsonError("Bulk CSV import is available for Dealer and Gold members.", 403);
  }

  let body: { filename?: string; rows?: BulkDraftRow[] };
  try {
    body = (await request.json()) as { filename?: string; rows?: BulkDraftRow[] };
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return jsonError("No rows to import.", 400);
  }
  if (rows.length > MAX_BULK_ROWS) {
    return jsonError(`Maximum ${MAX_BULK_ROWS} rows per upload.`, 400);
  }

  const importRecord = await db.bulkListingImport.create({
    data: {
      sellerId: seller.id,
      filename: body.filename?.slice(0, 200) || null,
      status: BulkImportStatus.PENDING,
      totalRows: rows.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
    },
  });

  const listingIds: string[] = [];
  const errors: { row: number; message: string }[] = [];

  for (const draft of rows) {
    const mapped = draftRowToCreateListingInput(draft);
    if ("error" in mapped) {
      errors.push({ row: draft.sourceRow ?? 0, message: mapped.error });
      continue;
    }
    const result = await createListing(seller.id, mapped);
    if (!result.success) {
      errors.push({ row: draft.sourceRow ?? 0, message: result.error });
      continue;
    }
    listingIds.push(result.listingId);
  }

  await db.bulkListingImport.update({
    where: { id: importRecord.id },
    data: {
      status: listingIds.length > 0 ? BulkImportStatus.COMPLETED : BulkImportStatus.FAILED,
      successCount: listingIds.length,
      errorCount: errors.length,
      errors: errors.slice(0, 100),
    },
  });

  return jsonCreated({
    importId: importRecord.id,
    totalRows: rows.length,
    successCount: listingIds.length,
    errorCount: errors.length,
    errors: errors.slice(0, 50),
    listingIds,
  });
}
