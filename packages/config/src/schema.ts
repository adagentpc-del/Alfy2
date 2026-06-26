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

  // --- Supabase (secrets) ---
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

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
  "AI_PROVIDER_API_KEY",
] as const satisfies ReadonlyArray<keyof Config>;
