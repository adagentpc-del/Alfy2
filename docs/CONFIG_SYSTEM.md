# Alfy² — Configuration System

One predictable way to configure everything. Config is **validated at boot**, and the system
**refuses to start** with invalid or missing required values.

---

## 1. Layers (precedence: lowest → highest)
1. **Packaged defaults** — safe, non-secret defaults shipped in `packages/config/defaults`.
2. **Environment file** — `.env` (local) or the platform's injected env (deploy). Secrets live here.
3. **Process environment** — real `process.env` / OS env overrides the file.
4. **Runtime feature flags** — `AI_ENABLED`, `AI_FEATURE_*`, `FLAG_*` toggles checked at use sites.

Higher layers override lower ones. Defaults never contain secrets.

## 2. Schema & validation
- A single schema (Zod in TS, mirrored Pydantic in Python) defines every config key, its type,
  whether it is required, and its default.
- `packages/config` loads layers, merges by precedence, then **validates against the schema**.
- On failure: log the precise missing/invalid keys and **exit non-zero**. No partial boot.
- Validated config is exposed as a **typed, read-only** object. No raw `process.env` access elsewhere
  (lint-enforced) — everything reads through the config module.

## 3. Categories of config
| Category | Examples | Source layer |
|---|---|---|
| Runtime | `ALFY_ENV`, `ALFY_LOG_LEVEL`, ports | env file / process env |
| Datastore | `SUPABASE_URL`, keys | env (secret) |
| AI controls | `AI_ENABLED`, `AI_DEFAULT_MODEL`, `AI_FEATURE_*` | env / runtime flags |
| Budgets | default token/cost ceilings | defaults, override via env |
| Tenancy | `ALFY_DEFAULT_TENANT_ID` (single-operator mode) | env |

## 4. Secrets handling
- Secrets are provided only via env / secret manager; never in defaults, never committed.
- `.env` is git-ignored; `.env.example` lists every key with a placeholder and a one-line comment.
- Secret values are never logged; the config module redacts known-secret keys in any debug dump.

## 5. Feature flags
- Default **off** for anything that costs money or performs irreversible work.
- Flags are read through the config module so they are centrally auditable.
- A flag's purpose and default are documented next to it in `.env.example`.

## 6. Environments
- `ALFY_ENV ∈ {development, staging, production}` selects default profiles.
- Production tightens: stricter rate limits, no debug dumps, mandatory secrets present.
- The same schema applies to all environments; only values differ.

## 7. Adding a new config key (checklist)
1. Add it to the schema (type, required?, default) in `packages/config`.
2. Add it to `.env.example` with a comment + placeholder.
3. Read it via the config module, never via raw env.
4. If it gates cost/irreversible action, default it to the safe (off/low) value.
