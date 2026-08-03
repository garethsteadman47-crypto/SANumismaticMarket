"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PageError({
  error,
  reset,
  title = "Something went wrong",
  homeHref = "/",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  homeHref?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangleIcon className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error interrupted this page. You can try again, or head back to the marketplace.
        </p>
        {error.digest ? <p className="text-xs text-muted-foreground">Ref: {error.digest}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href={homeHref} />}>
          Back to home
        </Button>
      </div>
    </main>
  );
}
