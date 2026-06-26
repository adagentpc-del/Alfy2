# ADR-0114: Founder Freedom Index

**Status:** Accepted
**Date:** 2026-06-25

## Context

Everything Alfy² does is in service of one outcome — giving Alyssa her life back — yet that outcome has never been
measured. Revenue, pipeline, and agent performance are all tracked; freedom is not. Without a single index, the
platform can grow busier while the founder grows less free and no one notices.

## Decision

Add a `freedom-index/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`compute()`** returns a **Founder
Freedom Index (0–100)** with a **trend** (rising / flat / falling), the current **bottleneck** (what most
constrains freedom right now), and one concrete **recommendation** to raise it. The invariant: **the index always
names the single bottleneck and one action**, so the number is never abstract.

### Contracts & data

`packages/shared/src/contracts/freedom-index.ts`: `FreedomIndex`, `FreedomTrend`, `ComputeFreedomInput`. Migration
`0188` stores index snapshots **append-only** (so the trend is real history, not a guess). Smoke `pnpm meta:smoke`.

## Consequences

- `compute()` returns a 0–100 index with trend, bottleneck, and recommendation.
- Snapshots are append-only (`0188`) — the trend is computed from real history.
- Composes the Personal Freedom Engine (ADR-0082) and the Nervous System engine (ADR-0106); read alongside Life ROI
  (ADR-0115) to answer whether the OS is actually working.
