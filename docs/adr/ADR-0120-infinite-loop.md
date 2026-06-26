# ADR-0120: The Infinite Loop

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² is not a set of features; it is one loop the enterprise runs forever. Stated plainly: **Observe → Understand →
Decide → Execute → Compound → Increase Freedom → Observe** — and back to the start, each turn leaving the founder
freer than the last. The platform needs this top-level operating model named explicitly, with every engine mapped to
the stage it serves.

## Decision

Add an `infinite-loop/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`stageOf()`** maps any module to
the **loop stage** it belongs to (observe / understand / decide / execute / compound / increase_freedom), and
**`describe()`** returns the loop with each stage's engines as a **read model**. The invariant: **every engine
belongs to exactly one stage of the loop** — nothing in the OS sits outside it.

### Contracts & data

`packages/shared/src/contracts/infinite-loop.ts`: `LoopStage`, `LoopStageMembership`, `InfiniteLoop`. No migration —
a static mapping read model. Smoke `pnpm meta:smoke`.

## Consequences

- `stageOf()` maps each module to one of six loop stages; `describe()` returns the whole loop.
- Read model — no migration.
- The top-level operating model the Operating Rhythm (ADR-0118) cycles; the Alfy² Equation (Reality → Understanding
  → Execution → Compounding → Freedom → Possibility → Reality) is its philosophical statement. Admission to the loop
  is gated by the Ultimate Design Rule (ADR-0121).

## Revision (2026-06-25) — persistence added
- A module's `LoopPlacement` (id / tenant_id / created_at) is now persisted as an **append-only** record via
  migration `0197` (`loop_placements`); the twelve `LoopStage` values are enforced by CHECK constraints mirrored
  from `LoopStageSchema`. The engine stays a read-model; this only records each placement. Contracts unchanged.
  Building on top of the existing system rather than replacing it.
