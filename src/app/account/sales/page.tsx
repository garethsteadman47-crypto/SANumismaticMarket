import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSpreadsheetIcon, TagIcon } from "lucide-react";
import { SubscriptionTier } from "@prisma/client";

import { AccountPlaceholderPanel, AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Sales — ${SITE_NAME}`,
  description: "Manage active listings, pending bids, and past sales on MintMark.",
};

export default async function AccountSalesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/sales");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true, isSaandDealer: true },
  });

  const canBulkImport =
    user?.subscriptionTier === SubscriptionTier.DEALER ||
    user?.subscriptionTier === SubscriptionTier.GOLD ||
    user?.isSaandDealer === true;

  return (
    <AccountSubpageShell
      activeHref="/account/sales"
      icon={TagIcon}
      title="Sales"
      description="Active listings you manage, pending offers and bids, plus a ledger of past sales and payouts."
    >
      {canBulkImport && (
        <Link
          href="/account/sales/bulk"
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-fit bg-amber-500 font-semibold text-black hover:bg-amber-400",
          )}
        >
          <FileSpreadsheetIcon className="size-4" aria-hidden />
          Bulk CSV Upload
        </Link>
      )}
      <AccountPlaceholderPanel
        title="Seller desk"
        body="Manage everything you have on the market from one place — live lots, incoming offers, auction activity, and historical sold items."
        bullets={[
          "Active buy-now listings and live auctions",
          "Pending bids and Make Offer requests",
          "Past sales with escrow payout status",
          "Quick links to edit or relist sold inventory",
          ...(canBulkImport ? ["Dealer bulk CSV inventory import"] : []),
        ]}
      />
    </AccountSubpageShell>
  );
}
