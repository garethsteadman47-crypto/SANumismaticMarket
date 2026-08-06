import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackageIcon } from "lucide-react";

import { AccountPlaceholderPanel, AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Orders — ${SITE_NAME}`,
  description: "Track active orders and courier shipments from The Courier Guy and PostNet.",
};

export default async function AccountOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/orders");
  }

  return (
    <AccountSubpageShell
      activeHref="/account/orders"
      icon={PackageIcon}
      title="Orders"
      description="Track active orders and courier updates from The Courier Guy and PostNet as your lots ship."
    >
      <AccountPlaceholderPanel
        title="Shipment tracking"
        body="Once you place a buy-now order or win an auction, tracking numbers and delivery milestones will appear here — including packing confirmation and inspection windows."
        bullets={[
          "Active orders awaiting seller dispatch",
          "The Courier Guy & PostNet tracking links",
          "Buyer inspection window countdown after delivery",
          "Escrow release status for each protected purchase",
        ]}
      />
    </AccountSubpageShell>
  );
}
