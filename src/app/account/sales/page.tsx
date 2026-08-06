import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TagIcon } from "lucide-react";

import { AccountPlaceholderPanel, AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Sales — ${SITE_NAME}`,
  description: "Manage active listings, pending bids, and past sales on MintMark.",
};

export default async function AccountSalesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/sales");
  }

  return (
    <AccountSubpageShell
      activeHref="/account/sales"
      icon={TagIcon}
      title="Sales"
      description="Active listings you manage, pending offers and bids, plus a ledger of past sales and payouts."
    >
      <AccountPlaceholderPanel
        title="Seller desk"
        body="Manage everything you have on the market from one place — live lots, incoming offers, auction activity, and historical sold items."
        bullets={[
          "Active buy-now listings and live auctions",
          "Pending bids and Make Offer requests",
          "Past sales with escrow payout status",
          "Quick links to edit or relist sold inventory",
        ]}
      />
    </AccountSubpageShell>
  );
}
