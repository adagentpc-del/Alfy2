# ADR-0111: Research & Development Department

**Status:** Accepted
**Date:** 2026-06-25

## Context

A company that never researches falls behind the moment its founder stops reading. Alfy² needs a department whose
only job is to keep the enterprise ahead — to evaluate emerging tools, methods, models, markets, and competitors,
and to disturb Alyssa only when a discovery is strong enough to act on. Without a high-confidence filter, R&D
becomes a firehose of "interesting" links; with one, it becomes an edge.

## Decision

Add an `rnd/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`evaluate()`** scores a candidate and
returns a **disposition** (adopt / pilot / monitor / ignore) with a **confidence** (0..1); **`report()`** assembles
the **Innovation Report** from the accumulated discoveries. The invariant: **only high-confidence discoveries
surface** — below the confidence floor an evaluation is recorded but never escalated, so R&D adds an edge, not
noise.

### Contracts & data

`packages/shared/src/contracts/rnd.ts`: `RndCandidate`, `RndDisposition`, `RndEvaluation`, `InnovationReport`.
Migration `0186` stores `rnd_discoveries` **append-only**. Smoke `pnpm meta:smoke`.

## Consequences

- `evaluate()` returns a disposition + confidence per candidate; only high-confidence discoveries reach Alyssa.
- `report()` produces the Innovation Report from accumulated discoveries.
- Discoveries are append-only (`0186`) — institutional memory of what was researched and why.
- Composes the Executive Intelligence Network (ADR-0067) and Future Trends Lab (ADR-0068); feeds the Acquisition
  Engine (ADR-0112) when a discovery implies a build/buy decision.
