/**
 * Next.js instrumentation hook — runs once when the Node server boots.
 * Validates production env keys so a misconfigured deploy fails immediately
 * instead of serving a broken marketplace.
 *
 * See https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    validateEnv();
  }
}
