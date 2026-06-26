/**
 * Packaged, NON-SECRET defaults — the lowest config layer (see docs/CONFIG_SYSTEM.md §1).
 * Anything secret or environment-specific is intentionally absent and must come from env.
 */
export const packagedDefaults: Record<string, string> = {
  ALFY_ENV: "development",
  ALFY_LOG_LEVEL: "info",
  ALFY_API_PORT: "8080",
  ALFY_ORCHESTRATOR_PORT: "8090",
  AI_ENABLED: "false",
  AI_DEFAULT_MODEL: "none",
  AI_FEATURE_SUMMARIZE: "false",
  AI_FEATURE_DRAFT: "false",
  AI_MAX_TOKENS_DEFAULT: "2000",
  AI_MAX_COST_USD_DEFAULT: "0.05",
  WORKERS_BASE_URL: "http://localhost:8081",
  FLAG_APPROVAL_AUTOEXECUTE_REVERSIBLE: "true",
};
