import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WalletIcon } from "lucide-react";

import { AccountPlaceholderPanel, AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Payouts — ${SITE_NAME}`,
  description: "Seller payout schedules, bank details, and escrow releases on MintMark.",
};

export default async function AccountPayoutsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/payouts");
  }

  return (
    <AccountSubpageShell
      activeHref="/account/payouts"
      icon={WalletIcon}
      title="Payouts"
      description="Track escrow releases, commission deductions, and the bank account that receives your seller proceeds."
    >
      <AccountPlaceholderPanel
        title="Seller payouts"
        body="Once a sale clears OTP delivery and the buyer protection window, net proceeds are released to your verified bank account. This dashboard will surface schedules and history here."
        bullets={[
          "Pending escrow balances awaiting buyer confirmation",
          "Released payouts with commission and verification fee line items",
          "Linked bank account status and update controls",
          "Silver / Gold membership fee offsets on eligible sales",
        ]}
      />
    </AccountSubpageShell>
  );
}
