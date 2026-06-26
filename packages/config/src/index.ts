/**
 * @alfy2/config — the ONLY place the codebase reads environment configuration.
 * Everything else imports the typed, validated result from here (lint-enforced).
 */
export { ConfigSchema, SECRET_KEYS, type Config } from "./schema.js";
export { packagedDefaults } from "./defaults.js";
export { loadConfig, ConfigError, type LoadOptions } from "./load.js";
export { redactConfig } from "./redact.js";
