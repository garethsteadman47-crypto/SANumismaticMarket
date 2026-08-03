"use client";

import { PageError } from "@/components/PageError";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError error={error} reset={reset} title="Checkout unavailable" />;
}
