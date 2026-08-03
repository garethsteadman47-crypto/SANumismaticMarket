import { z } from "zod";

/**
 * Environment variable validation.
 *
 * Only `DATABASE_URL` and `AUTH_SECRET` are boot-blocking: without them the
 * app literally cannot function (no DB connection, no auth), so a real
 * production runtime throws immediately rather than serving a broken site.
 *
 * Every other key here (UploadThing, payment gateways, OAuth, the cron
 * secret) backs an optional or not-yet-wired feature — a missing one
 * degrades that single feature gracefully (e.g. `/api/v1/cron/settle` just
 * runs unauthenticated) and should never take the whole marketplace down.
 * Those gaps are logged as warnings instead.
 *
 * Local `next build`, unit tests, and development stay permissive (with
 * console warnings) unless `ENFORCE_ENV_VALIDATION=1` is set.
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

  // Optional — file uploads aren't wired to any route yet.
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

  // Optional — protects /api/v1/cron/settle; unset just means that one
  // route runs unauthenticated (fine for early-stage / internal cron use).
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
 * When true, a missing `DATABASE_URL` / `AUTH_SECRET` aborts boot.
 * Enabled for real production runtimes, or when explicitly forced via
 * `ENFORCE_ENV_VALIDATION`.
 */
export function shouldFailFast(raw: NodeJS.ProcessEnv = process.env): boolean {
  if (raw.ENFORCE_ENV_VALIDATION === "1") return true;
  if (raw.ENFORCE_ENV_VALIDATION === "0") return false;
  if (isBuildTime(raw)) return false;
  return raw.NODE_ENV === "production" && (raw.VERCEL_ENV === "production" || raw.VERCEL !== "1");
}

const RECOMMENDED_PRODUCTION_KEYS: Array<{ key: keyof AppEnv; hint: string }> = [
  { key: "UPLOADTHING_TOKEN", hint: "listing images + unboxing videos will be unavailable until this is set." },
  { key: "CRON_SECRET", hint: "/api/v1/cron/settle will run unauthenticated until this is set." },
];

/**
 * Validate `process.env`.
 *
 * Throws only when `DATABASE_URL` or `AUTH_SECRET` is missing/empty and
 * fail-fast guards are active (real production, or `ENFORCE_ENV_VALIDATION=1`)
 * — those two are the only keys the app cannot run without. All other
 * missing optional keys are warned about, never thrown, so an incomplete
 * (but functional) production config never takes the whole app down.
 */
export function validateEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  const failFast = shouldFailFast(raw);
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const hardIssues = parsed.error.issues.filter(
      (issue) => issue.path[0] === "DATABASE_URL" || issue.path[0] === "AUTH_SECRET"
    );
    const message = `Invalid environment configuration:\n${formatZodError(parsed.error)}`;

    if (failFast && hardIssues.length > 0) {
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
    const gaps = RECOMMENDED_PRODUCTION_KEYS.filter(({ key }) => !env[key]);
    for (const { key, hint } of gaps) {
      console.warn(`[env] ${key} is not set — ${hint}`);
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
