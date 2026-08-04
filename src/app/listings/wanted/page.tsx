import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { auth } from "@/lib/auth";
import { listWantedItems } from "@/lib/wanted";
import { formatZarCents } from "@/lib/utils/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WantedRequestModal } from "@/components/wanted/WantedRequestModal";

export const dynamic = "force-dynamic";

export default async function WantedListingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <SearchIcon className="size-8 text-muted-foreground" />
        <h1 className="font-heading text-2xl font-semibold">Wanted requests</h1>
        <p className="text-sm text-muted-foreground">Sign in to create alerts for unlisted coins.</p>
        <Button nativeButton={false} render={<Link href="/login" />}>
          Sign in
        </Button>
      </main>
    );
  }

  const items = await listWantedItems(session.user.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Wanted requests</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll flag matching listings on your dashboard when they appear.
          </p>
        </div>
        <WantedRequestModal />
      </div>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No wanted requests yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base">{item.eraCategory}</CardTitle>
                <Badge variant={item.status === "MATCHED" ? "default" : "secondary"}>{item.status}</Badge>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                <div>Year: {item.targetYear ?? "Any"}</div>
                <div>Min grade: {item.minimumGrade ?? "Any"}</div>
                <div>Budget: {formatZarCents(item.budgetCents)}</div>
                {item.matchedListingId && (
                  <div className="sm:col-span-3">
                    <Link href={`/listings/${item.matchedListingId}`} className="text-amber-700 underline dark:text-amber-400">
                      View matched listing
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
