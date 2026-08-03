import { afterEach, describe, expect, it, vi } from "vitest";

import { isBuildTime, resetEnvCacheForTests, shouldFailFast, validateEnv } from "./env";

afterEach(() => {
  resetEnvCacheForTests();
  vi.restoreAllMocks();
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

  it("throws when fail-fast is forced and AUTH_SECRET is missing", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        ENFORCE_ENV_VALIDATION: "1",
        DATABASE_URL: "mongodb+srv://user:pass@cluster/db",
      })
    ).toThrow(/AUTH_SECRET/);
  });

  it("never throws for missing UPLOADTHING_TOKEN or CRON_SECRET, even with fail-fast forced", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const env = validateEnv({
      NODE_ENV: "production",
      ENFORCE_ENV_VALIDATION: "1",
      DATABASE_URL: "mongodb+srv://user:pass@cluster/db",
      AUTH_SECRET: "super-secret-value-1234567890",
    });

    expect(env.UPLOADTHING_TOKEN).toBeUndefined();
    expect(env.CRON_SECRET).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("UPLOADTHING_TOKEN"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("CRON_SECRET"));
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

  it("does not throw in a real production boot when only optional secrets are missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        DATABASE_URL: "mongodb+srv://user:pass@cluster/db",
        AUTH_SECRET: "super-secret-value-1234567890",
      })
    ).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });
});
