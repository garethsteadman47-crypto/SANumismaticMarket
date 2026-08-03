"use client";

import { PageError } from "@/components/PageError";

export default function OrderDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError error={error} reset={reset} title="Couldn't load this order" />;
}
