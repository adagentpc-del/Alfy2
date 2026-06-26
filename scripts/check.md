# scripts/check

`pnpm run check` is the Phase-0 stand-in for a full boot (see `docs/STARTUP_SEQUENCE.md` §4).

Today it runs `scripts/check.placeholder.mjs`, which validates:
- `.env.example` exists and is non-empty.
- every `modules/*/manifest.json` parses and declares the required fields
  (`id`, `version`, `capabilities`, `requires_agents`, `owner`).

Phase 1 replaces this with real config-schema validation + registry resolution.
