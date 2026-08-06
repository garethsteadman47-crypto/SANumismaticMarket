import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeartIcon } from "lucide-react";

import { AccountPlaceholderPanel, AccountSubpageShell } from "@/components/account/AccountSubpageShell";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Wishlist — ${SITE_NAME}`,
  description: "Saved items and Wanted alerts for unlisted coins on MintMark.",
};

export default async function AccountWishlistPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/wishlist");
  }

  return (
    <AccountSubpageShell
      activeHref="/account/wishlist"
      icon={HeartIcon}
      title="Wishlist"
      description='Saved lots you are watching, plus "Wanted" alerts for coins that are not yet listed on the marketplace.'
    >
      <AccountPlaceholderPanel
        title="Saved & Wanted"
        body="Bookmark live listings to revisit later, and set Wanted alerts so you are notified when a matching coin, year, or grade hits the market."
        bullets={[
          "Saved active listings and auctions",
          "Wanted alerts for unlisted coins and dates",
          "Match notifications for Silver+ members",
          "One-tap remove or move to purchase",
        ]}
      />
    </AccountSubpageShell>
  );
}
