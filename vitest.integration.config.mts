import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Config for integration tests that spin up a real (ephemeral) MongoDB
 * replica set via `mongodb-memory-server`. These are slower and require
 * downloading a `mongod` binary on first run, so they're kept out of the
 * default `npm test` — run them explicitly with `npm run test:integration`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
