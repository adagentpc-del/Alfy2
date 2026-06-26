import { ConfigSchema, type Config } from "./schema.js";
import { packagedDefaults } from "./defaults.js";

/**
 * Layered config loader (see docs/CONFIG_SYSTEM.md §1).
 * Precedence, lowest -> highest: packagedDefaults -> provided env (e.g. parsed .env) -> process.env.
 * Runtime feature flags are read from the validated result at their use sites.
 *
 * Validates against ConfigSchema. On failure, throws a ConfigError listing the offending keys —
 * callers (service entrypoints) translate that into a non-zero exit. NO partial config is returned.
 */

export class ConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid configuration:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "ConfigError";
  }
}

export interface LoadOptions {
  /** Optional pre-parsed env file contents (e.g. from a .env parser). */
  fileEnv?: Record<string, string | undefined>;
  /** Defaults to process.env. */
  processEnv?: Record<string, string | undefined>;
}

export function loadConfig(options: LoadOptions = {}): Config {
  const { fileEnv = {}, processEnv = process.env } = options;

  const merged: Record<string, string | undefined> = {
    ...packagedDefaults,
    ...stripUndefined(fileEnv),
    ...stripUndefined(processEnv),
  };

  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new ConfigError(issues);
  }
  return Object.freeze(result.data);
}

function stripUndefined(
  obj: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
