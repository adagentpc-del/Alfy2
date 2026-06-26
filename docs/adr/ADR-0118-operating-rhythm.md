# ADR-0118: Enterprise Operating Rhythm

**Status:** Accepted
**Date:** 2026-06-25

## Context

A serious company runs on a cadence: a daily standup, a weekly review, a monthly close, a quarterly plan, an annual
reset. A solo founder rarely has one, so the important-but-not-urgent work slips. Alfy² should impose the rhythm of
a real operator by generating the right agenda for the right interval.

## Decision

Add an `operating-rhythm/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`agenda()`** returns the agenda
for a given interval — **daily / weekly / monthly / quarterly / annual** — assembled from the relevant engines as a
**read model**. The invariant: **each interval has a fixed, predictable agenda shape**, so the founder always knows
what a Monday or a quarter-start asks of her.

### Contracts & data

`packages/shared/src/contracts/operating-rhythm.ts`: `RhythmInterval`, `AgendaItem`, `RhythmAgenda`. No migration —
a read model over existing engines. Smoke `pnpm meta:smoke`.

## Consequences

- `agenda()` returns the daily / weekly / monthly / quarterly / annual agenda for the interval requested.
- Read model — no migration.
- Composes the Briefing Engine (ADR-0070) and the Reflection Engine (ADR-0053); the Executive Operating Manual
  (ADR-0119) documents the rhythm, and the Infinite Loop (ADR-0120) is the model it cycles.
