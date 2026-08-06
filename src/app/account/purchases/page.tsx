import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShoppingBagIcon } from "lucide-react";

import { AccountPlaceholderPanel, AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Purchases — ${SITE_NAME}`,
  description: "History of completed winning bids and buy-now purchases on MintMark.",
};

export default async function AccountPurchasesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/purchases");
  }

  return (
    <AccountSubpageShell
      activeHref="/account/purchases"
      icon={ShoppingBagIcon}
      title="Purchases"
      description="Your completed buy-now checkouts and winning auction bids — a permanent record of lots that cleared escrow."
    >
      <AccountPlaceholderPanel
        title="Purchase history"
        body="Every settled trade will land here with invoice details, final price, and links back to the listing certificate or slab verification."
        bullets={[
          "Completed buy-now purchases",
          "Winning auction bids that cleared payment",
          "Invoice & receipt downloads",
          "Verified Authentic Shield status at time of sale",
        ]}
      />
    </AccountSubpageShell>
  );
}
