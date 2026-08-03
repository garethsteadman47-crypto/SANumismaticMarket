import { z } from "zod";

/**
 * Environment variable validation.
 *
 * Production deploys fail fast when mandatory keys are missing so the
 * marketplace never boots half-configured. Local `next build`, unit tests,
 * and development stay permissive (with console warnings) unless
 * `ENFORCE_ENV_VALIDATION=1` is set.
 */

const optionalNonEmpty = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required."),
  NEXTAUTH_URL: optionalNonEmpty,

  // Required when production guards are enforced (see `shouldFailFast`).
  UPLOADTHING_TOKEN: optionalNonEmpty,

  GOOGLE_CLIENT_ID: optionalNonEmpty,
  GOOGLE_CLIENT_SECRET: optionalNonEmpty,

  AWS_ACCESS_KEY_ID: optionalNonEmpty,
  AWS_SECRET_ACCESS_KEY: optionalNonEmpty,
  AWS_REGION: optionalNonEmpty,
  AWS_S3_BUCKET_NAME: optionalNonEmpty,

  OZOW_SITE_CODE: optionalNonEmpty,
  OZOW_PRIVATE_KEY: optionalNonEmpty,
  STITCH_CLIENT_ID: optionalNonEmpty,
  STITCH_CLIENT_SECRET: optionalNonEmpty,
  CAPITEC_PAY_MERCHANT_ID: optionalNonEmpty,

  CRON_SECRET: optionalNonEmpty,
});

export type AppEnv = z.infer<typeof envSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");
}

/** True during `next build` compile — skip hard production throws. */
export function isBuildTime(raw: NodeJS.ProcessEnv = process.env): boolean {
  return raw.NEXT_PHASE === "phase-production-build" || raw.npm_lifecycle_event === "build";
}

/**
 * When true, missing Mongo / Auth / UploadThing / Cron secrets abort boot.
 * Enabled for real production runtimes, or when explicitly forced.
 */
export function shouldFailFast(raw: NodeJS.ProcessEnv = process.env): boolean {
  if (raw.ENFORCE_ENV_VALIDATION === "1") return true;
  if (raw.ENFORCE_ENV_VALIDATION === "0") return false;
  if (isBuildTime(raw)) return false;
  return raw.NODE_ENV === "production" && (raw.VERCEL_ENV === "production" || raw.VERCEL !== "1");
}

/**
 * Validate `process.env`. Throws when fail-fast guards are active and
 * required keys are missing; otherwise returns a best-effort object and
 * may warn to the console.
 */
export function validateEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  const failFast = shouldFailFast(raw);
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const message = `Invalid environment configuration:\n${formatZodError(parsed.error)}`;
    if (failFast) {
      throw new Error(message);
    }
    console.warn(`[env] ${message}`);
    return {
      NODE_ENV: (raw.NODE_ENV as AppEnv["NODE_ENV"]) ?? "development",
      DATABASE_URL: raw.DATABASE_URL ?? "",
      AUTH_SECRET: raw.AUTH_SECRET ?? "",
      NEXTAUTH_URL: raw.NEXTAUTH_URL || undefined,
      UPLOADTHING_TOKEN: raw.UPLOADTHING_TOKEN || undefined,
      CRON_SECRET: raw.CRON_SECRET || undefined,
    } as AppEnv;
  }

  const env = parsed.data;

  if (failFast) {
    const productionGaps: string[] = [];
    if (!env.UPLOADTHING_TOKEN) {
      productionGaps.push("UPLOADTHING_TOKEN is required in production (listing images + unboxing videos).");
    }
    if (!env.CRON_SECRET) {
      productionGaps.push("CRON_SECRET is required in production (protects /api/cron/settle-holds).");
    }
    if (productionGaps.length > 0) {
      throw new Error(`Invalid environment configuration:\n${productionGaps.join("\n")}`);
    }
  }

  return env;
}

let cachedEnv: AppEnv | undefined;

/** Lazily validated, process-wide env singleton. */
export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

/** Test helper — clears the cached singleton between cases. */
export function resetEnvCacheForTests(): void {
  cachedEnv = undefined;
}
