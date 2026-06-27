# 40 · Prompts (reusable)

Store reusable prompts here, categorized. (Prompt packs also live in the `build-from-brainstorm` engine.)

## Development — parallel engine build (the proven pattern)
"Build ONE new engine in the Alfy² monorepo … contracts-first … own contract + engine folder +
migration NNNN + smoke … FORBIDDEN to touch shared/index.ts, core/index.ts, models.py, package.json …
unique-prefix all exports … verify with an isolated `tsc --noEmit` … return WIRING NOTES." Orchestrator
then wires barrels + package.json, runs the full `tsc -b` + smokes + pytest gate, applies the migration
live, and (a separate agent) builds the Pydantic mirror.

## Verification gate (run before "done")
"Fresh copy of packages/services/scripts + manifests → `pnpm install` → `tsc -b` → run the relevant
`scripts/*-smoke.mts` → `cd workers && pytest`."

## Architecture / governance
"Audit the existing docs before editing — find duplicates, contradictions, stale counts. Revise by
merging/correcting/extending, not appending disconnected content. Reference existing docs; don't
duplicate."

## Bug-fix scan
"Read-only review of the runtime: gate coverage, tenant isolation, SQL↔schema column match,
parameterization, async/await, null-handling, error leakage. Rank CRITICAL/HIGH/MEDIUM/LOW with
file:line + fix."

> Categories to grow: Research · Architecture · UI · Testing · Automation · Marketing · Documentation.
