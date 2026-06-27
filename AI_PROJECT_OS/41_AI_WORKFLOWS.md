# 41 · AI Workflows

## Standard AI session workflow (every AI follows this)
**STEP 1 — Read:** `01_PROJECT_OVERVIEW`, `04_SYSTEM_ARCHITECTURE`, `10_CURRENT_STATE`,
`11_ACTIVE_SPRINT`, `12_TASK_QUEUE`, `14_DECISIONS`.
**STEP 2 — Analyze:** the repository + existing implementation. Never assume. Search before building.
Honor `docs/ARCHITECTURE_FREEZE.md` (only bugs/contradictions/deps/security/perf/impl-discoveries until
the first slice ships).
**STEP 3 — Do only the requested work.** Do not redesign existing systems unless explicitly told.
Verify-merge over rebuild: check the catalog before creating anything new.
**STEP 4 — After completion, update:** `10_CURRENT_STATE`, `13_CHANGELOG`, `12_TASK_QUEUE`,
`11_ACTIVE_SPRINT`, and `14_DECISIONS` (if a decision was made). Run the verification gate first.

## Build/verify gate (definition of done)
Full `tsc -b` green · the relevant `scripts/*-smoke.mts` pass · `workers` pytest green · any new table
has RLS · any state-changing route is approval-gated · migration applied + verified live · docs updated.

## Multi-agent build
Spin N subagents on DISJOINT files (each: own contract/engine/migration/smoke, unique prefixes,
forbidden from shared barrels/models.py/package.json). Orchestrator integrates + runs the unified gate +
applies migrations live. See `40_PROMPTS.md`.
