# ADR-0107: Relaxation Outcome + True Progress

**Status:** Accepted
**Date:** 2026-06-25

## Context

A platform that measures the wrong thing optimizes the founder into the ground. Busyness, more tasks, more
dashboards, and vanity metrics all *feel* like progress while delivering none of it. The L0 directive is the
opposite: money created, risk controlled, tasks delegated, systems running, founder freedom, and peace of mind. To
hold to that, the platform needs two engines that keep it honest about outcomes — one that turns intent into
relaxation, one that refuses to confuse intensity with progress. This ADR adds the Relaxation Outcome and True
Progress engines.

## Decision

Add an `outcome/` pair in `@alfy2/core` — `relaxation.ts` and `true-progress.ts`. Deterministic, tenant-scoped. The
Relaxation Outcome engine's **`plan()`** sorts work into relaxation buckets; the True Progress engine's **`assess()`**
judges whether work is real progress and recommends an action.

### Optimize for outcomes, never intensity

The platform optimizes for **money created, risk controlled, tasks delegated, systems running, founder freedom, and
peace of mind** — and **never** busyness, more tasks, more dashboards, or vanity metrics. The True Progress engine's
hard invariant: **it must never confuse intensity with progress** — a frantic day with no money, risk reduction,
delegation, or system built scores as motion, not progress, and is recommended for change. The Relaxation Outcome
engine plans toward the founder's peace of mind rather than her utilization.

### Contracts & data

`packages/shared/src/contracts/outcome-engines.ts`: `RelaxBucket`, `RelaxItemInput`, `RelaxPlanInput`, `RelaxItem`,
`RelaxationPlan`, `ProgressKind`, `ProgressAction`, `AssessProgressInput`, `ProgressAssessment`. No migration —
deterministic. Smoke `pnpm capstone:smoke`.

## Consequences

- The platform optimizes for money / risk control / delegation / systems / freedom / peace of mind, never busyness
  or vanity metrics.
- True Progress never confuses intensity with progress; Relaxation Outcome plans toward peace of mind.
- Migration `0184_progress_assessments.sql` (append-only `progress_assessments (True Progress; Relaxation is a read-model)`).
- Phase 2 feeds True Progress assessments into the Board Packet and Relaxation plans into the Nervous System engine.
