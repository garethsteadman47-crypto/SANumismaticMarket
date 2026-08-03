import { afterEach, describe, expect, it } from "vitest";

import { isBuildTime, resetEnvCacheForTests, shouldFailFast, validateEnv } from "./env";

afterEach(() => {
  resetEnvCacheForTests();
});

describe("env validation", () => {
  it("accepts a complete production-like env when fail-fast is forced", () => {
    const env = validateEnv({
      NODE_ENV: "production",
      ENFORCE_ENV_VALIDATION: "1",
      DATABASE_URL: "mongodb+srv://user:pass@cluster/db",
      AUTH_SECRET: "super-secret-value-1234567890",
      UPLOADTHING_TOKEN: "ut_token",
      CRON_SECRET: "cron-secret",
      NEXTAUTH_URL: "https://example.com",
    });

    expect(env.DATABASE_URL).toContain("mongodb");
    expect(env.UPLOADTHING_TOKEN).toBe("ut_token");
    expect(env.CRON_SECRET).toBe("cron-secret");
  });

  it("throws when fail-fast is forced and UploadThing/Cron secrets are missing", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        ENFORCE_ENV_VALIDATION: "1",
        DATABASE_URL: "mongodb+srv://user:pass@cluster/db",
        AUTH_SECRET: "super-secret-value-1234567890",
      })
    ).toThrow(/UPLOADTHING_TOKEN/);
  });

  it("throws when fail-fast is forced and DATABASE_URL is missing", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        ENFORCE_ENV_VALIDATION: "1",
        AUTH_SECRET: "super-secret-value-1234567890",
        UPLOADTHING_TOKEN: "ut_token",
        CRON_SECRET: "cron-secret",
      })
    ).toThrow(/DATABASE_URL/);
  });

  it("does not fail fast during build time even in production NODE_ENV", () => {
    expect(
      shouldFailFast({
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
        VERCEL_ENV: "production",
      })
    ).toBe(false);
    expect(isBuildTime({ NEXT_PHASE: "phase-production-build" })).toBe(true);
  });

  it("stays permissive in development without required upload secrets", () => {
    const env = validateEnv({
      NODE_ENV: "development",
      DATABASE_URL: "mongodb://127.0.0.1:27017/dev?replicaSet=testset",
      AUTH_SECRET: "dev-secret",
    });
    expect(env.DATABASE_URL).toContain("27017");
    expect(env.UPLOADTHING_TOKEN).toBeUndefined();
  });
});
