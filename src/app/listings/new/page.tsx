import { auth } from "@/lib/auth";
import { ListingWizard } from "@/components/listings/ListingWizard";
import { SubscriptionTier } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const session = await auth();
  const sellerTier = session?.user?.subscriptionTier ?? SubscriptionTier.STANDARD;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">Create a listing</h1>
        <p className="text-sm text-muted-foreground">
          Four-step wizard — identification, logistics, pricing strategy, then media and verification preview.
        </p>
      </div>
      <ListingWizard sellerTier={sellerTier} />
    </main>
  );
}
