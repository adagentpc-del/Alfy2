import { z } from "zod";

/**
 * The single source of truth for every configuration key (see docs/CONFIG_SYSTEM.md).
 * Required keys with no default cause a hard boot failure when absent.
 *
 * Env values arrive as strings; we coerce/transform here so the rest of the codebase consumes a
 * typed, validated object and never touches process.env directly.
 */

const boolFromEnv = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

export const ConfigSchema = z.object({
  // --- Runtime ---
  ALFY_ENV: z.enum(["development", "staging", "production"]).default("development"),
  ALFY_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ALFY_DEFAULT_TENANT_ID: z.string().uuid(),
  ALFY_API_PORT: z.coerce.number().int().positive().default(8080),
  ALFY_ORCHESTRATOR_PORT: z.coerce.number().int().positive().default(8090),
  // Gateway auth strategy. "jwks" verifies Supabase JWTs (production default). "token" accepts a
  // single shared bearer secret (ALFY_API_TOKEN) — a personal access token for a single operator,
  // so the dashboard can read live data without a full login flow. The token is a secret; it lives in
  // env + the operator's browser only, never in any committed file or public page.
  ALFY_AUTH_MODE: z.enum(["jwks", "token"]).default("jwks"),
  ALFY_API_TOKEN: z.string().min(16).optional(),
  // Comma-separated list of browser origins allowed to call the API (CORS). Defaults cover local dev
  // and the Vercel dashboard.
  ALFY_CORS_ORIGINS: z
    .string()
    .default("http://localhost:8080,http://localhost:3000,https://alfy2.vercel.app"),

  // --- Supabase (secrets) ---
  SUPABASE_URL: z.string().url(),
  // The gateway does NOT use these at runtime (it verifies JWTs via SUPABASE_URL's JWKS and talks to
  // Postgres via DATABASE_URL). They're optional so the API boots without them; connectors that need
  // them validate their own presence when used. (Naming varies — anon == publishable.)
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Direct Postgres connection string (Supabase pooler) used by @alfy2/db for the RLS GUC pattern.
  // Optional so config still loads before the persistence layer is wired; the Db factory throws a
  // clear error if it is needed but missing.
  DATABASE_URL: z.string().min(1).optional(),

  // --- AI controls (off by default) ---
  AI_ENABLED: boolFromEnv.default(false),
  AI_DEFAULT_MODEL: z.string().min(1).default("none"),
  AI_PROVIDER_API_KEY: z.string().optional(),
  AI_FEATURE_SUMMARIZE: boolFromEnv.default(false),
  AI_FEATURE_DRAFT: boolFromEnv.default(false),
  AI_MAX_TOKENS_DEFAULT: z.coerce.number().int().nonnegative().default(2000),
  AI_MAX_COST_USD_DEFAULT: z.coerce.number().nonnegative().default(0.05),

  // --- Agent transport ---
  WORKERS_BASE_URL: z.string().url().default("http://localhost:8081"),

  // --- Generic flags ---
  FLAG_APPROVAL_AUTOEXECUTE_REVERSIBLE: boolFromEnv.default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

/** Keys whose values must never be logged. Used by the redactor. */
export const SECRET_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "AI_PROVIDER_API_KEY",
  "ALFY_API_TOKEN",
] as const satisfies ReadonlyArray<keyof Config>;
