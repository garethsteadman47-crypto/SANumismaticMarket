import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileSpreadsheetIcon } from "lucide-react";
import { SubscriptionTier } from "@prisma/client";

import { BulkCsvUploadPanel } from "@/components/account/BulkCsvUploadPanel";
import { AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: `Bulk CSV Upload — ${SITE_NAME}`,
  description: "Dealer bulk inventory upload via CSV for MintMark sales.",
};

export default async function BulkSalesUploadPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/sales/bulk");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true, isSaandDealer: true },
  });

  const allowed =
    user?.subscriptionTier === SubscriptionTier.DEALER ||
    user?.subscriptionTier === SubscriptionTier.GOLD ||
    user?.isSaandDealer === true;

  if (!allowed) {
    redirect("/account/sales");
  }

  return (
    <AccountSubpageShell
      activeHref="/account/sales"
      icon={FileSpreadsheetIcon}
      title="Bulk CSV Upload"
      description="Import dealer inventory from a spreadsheet — each row becomes a Buy Now listing with labeled media URLs."
    >
      <BulkCsvUploadPanel />
    </AccountSubpageShell>
  );
}
