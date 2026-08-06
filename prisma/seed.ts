/**
 * CLI entry for `npm run db:seed` / `prisma db seed`.
 * Implementation lives in `src/lib/demo-seed.ts` so Vercel can also seed via API.
 */
import { runDemoSeed } from "../src/lib/demo-seed";

runDemoSeed()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // demo-seed uses the shared Prisma singleton; disconnect for CLI exit.
    const { db } = await import("../src/lib/db");
    await db.$disconnect();
  });
