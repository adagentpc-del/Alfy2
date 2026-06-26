# ADR-0112: Acquisition Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

When a capability is needed, building it is only one of eight choices — and often the worst one. A serious operator
asks first whether to buy, partner, license, white-label, acquire, invest, or simply ignore. Alfy² needs a
capital-allocator's lens on every capability gap so that scarce founder time and money go to the highest-return
route, not the default of "we'll build it ourselves."

## Decision

Add an `acquisition/` engine in `@alfy2/core`. Deterministic, tenant-scoped. **`evaluate()`** scores a capability
gap and recommends one of **8 dispositions — build / buy / partner / license / white_label / acquire / invest /
ignore** — using **capital-allocator scoring** (cost, speed, control, leverage, risk, strategic fit). The invariant:
**every gap gets a disposition with its reasoning and the trade-off of the routes not chosen.**

### Contracts & data

`packages/shared/src/contracts/acquisition.ts`: `CapabilityGap`, `AcquisitionDisposition`, `AcquisitionEvaluation`.
Migration `0187` stores evaluations **append-only**. Smoke `pnpm meta:smoke`.

## Consequences

- `evaluate()` returns one of 8 dispositions with capital-allocator scoring and the routes not chosen.
- Evaluations are append-only (`0187`).
- Composes the Executive Capital Allocator (ADR-0088) and Opportunity Cost Engine (ADR-0089); consumes R&D
  discoveries (ADR-0111) that surface a capability worth acquiring rather than building.
