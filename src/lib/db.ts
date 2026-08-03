import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton.
 *
 * Next.js hot-reloads modules in development, which would otherwise create
 * a new `PrismaClient` (and a new connection pool) on every file save. We
 * cache the instance on the Node global object to avoid exhausting MongoDB
 * connections.
 */

declare global {
  var __prisma: PrismaClient | undefined;
}

export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
