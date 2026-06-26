# @alfy2/shared

The **only** legal cross-boundary surface. Contracts defined here (as Zod schemas, mirrored by
Pydantic in `workers/alfy_workers/contracts`) are how modules, agents, and the core communicate.

Imports nothing internal. Everything else may import this; this imports no other `@alfy2/*` package.

## Contracts to define in Phase 1
- `Task` — core → agent envelope.
- `SignalToAction` — universal explainable output.
- `ModuleManifest` — module self-description.
- `AgentRegistration` — agent self-description.

See `docs/TECH_SPEC.md` §3 for the exact shapes. No implementation lives here — schemas only.
