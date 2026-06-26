# ADR-0115: Life ROI Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Financial ROI is half the truth. A feature that earns money but costs the founder her evenings has a negative
return on the only thing Alfy² is built to protect. Every automation, delegation, and system needs to be scored on
both axes: the money it returns **and** the life it returns.

## Decision

Add a `life-roi/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`evaluate()`** scores an initiative on
**both financial ROI and life returned**, surfacing **`workdays_returned`** — the founder time handed back — as a
first-class metric alongside the dollars. The invariant: **every evaluation reports life returned, not only money**;
an initiative that earns but consumes the founder is flagged.

### Contracts & data

`packages/shared/src/contracts/life-roi.ts`: `LifeRoiInput`, `LifeRoiResult` (with `workdays_returned`). Migration
`0189` stores evaluations **append-only**. Smoke `pnpm meta:smoke`.

## Consequences

- `evaluate()` reports financial ROI **and** `workdays_returned` — life returned is first-class.
- Evaluations are append-only (`0189`).
- Composes Workflow ROI Tracking (ADR-0023) and the Personal Freedom Engine (ADR-0082); feeds the Freedom Index
  (ADR-0114) so the headline index is grounded in concrete returned-time evidence.
