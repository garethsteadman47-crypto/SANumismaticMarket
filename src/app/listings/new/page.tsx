import { auth } from "@/lib/auth";
import { NewListingEntry } from "@/components/NewListingEntry";
import { SubscriptionTier } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const session = await auth();
  const sellerTier = session?.user?.subscriptionTier ?? SubscriptionTier.STANDARD;

  let canBulkImport = false;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, isSaandDealer: true },
    });
    canBulkImport =
      user?.subscriptionTier === SubscriptionTier.DEALER ||
      user?.subscriptionTier === SubscriptionTier.GOLD ||
      user?.isSaandDealer === true;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <NewListingEntry sellerTier={sellerTier} canBulkImport={canBulkImport} />
    </main>
  );
}
