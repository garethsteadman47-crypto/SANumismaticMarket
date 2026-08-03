/**
 * Starts an ephemeral MongoDB replica set (required for Prisma transactions)
 * using mongodb-memory-server. Prints DATABASE_URL and keeps the process alive
 * until SIGINT/SIGTERM.
 *
 * Usage:
 *   node scripts/start-mongo-memory.mjs
 *   # then in another shell: export DATABASE_URL=... && npm run db:seed
 */
import { MongoMemoryReplSet } from "mongodb-memory-server";

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const uri = replSet.getUri("sa_numismatic_marketplace_dev");

console.log("");
console.log("Ephemeral MongoDB replica set is ready.");
console.log(`DATABASE_URL="${uri}"`);
console.log("");
console.log("Export that URL into your shell / .env, then run:");
console.log("  npx prisma generate");
console.log("  npm run db:seed");
console.log("  npm run dev");
console.log("");
console.log("Press Ctrl+C to stop the replica set.");

async function shutdown() {
  console.log("\nStopping MongoDB memory replica set...");
  await replSet.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await new Promise(() => {});
