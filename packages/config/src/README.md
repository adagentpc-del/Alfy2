# @alfy2/config

Layered configuration (defaults → env file → process env → runtime flags), validated against a
single schema at boot. See `docs/CONFIG_SYSTEM.md`.

Phase 1 implements:
- `defaults/` — packaged non-secret defaults.
- `schema.ts` — typed schema (required?, type, default) for every key in `.env.example`.
- `load()` — merge by precedence, validate, expose a typed read-only config. Exit non-zero on failure.
- Secret-key redaction for any debug dump.

Rule: nothing else in the codebase reads `process.env` directly — only this package does.
