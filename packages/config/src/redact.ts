import { SECRET_KEYS, type Config } from "./schema.js";

const SECRET_SET = new Set<string>(SECRET_KEYS);

/**
 * Produce a log-safe view of config: secret values become "[redacted]".
 * Use this for any debug dump — never log the raw config object.
 */
export function redactConfig(config: Config): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    out[key] = SECRET_SET.has(key) ? "[redacted]" : value;
  }
  return out;
}
