import { ListingForm } from "@/components/ListingForm";

export default function NewListingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Create a listing</h1>
        <p className="text-sm text-muted-foreground">
          List a coin, banknote, or bullion item. Graded items can be verified against SANGS, NGC, PCGS, or Hern&apos;s
          Handbook before you publish.
        </p>
      </div>
      <ListingForm />
    </main>
  );
}
