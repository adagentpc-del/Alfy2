# ADR-0056: Digital Twin

**Status:** Accepted
**Date:** 2026-06-25

## Context

Forecasting and planning need a single, current model of the whole enterprise — not a dashboard read at a moment,
and not a one-off scenario, but a standing model that stays up to date and can be perturbed to ask "what if?"
The Control Tower (ADR-0027) gives a read snapshot and the Business Simulation Engine (ADR-0048) compares two
options; neither holds a continuous model of the enterprise that what-if questions run against. This ADR adds
that model.

## Decision

Add a `digital-twin/` engine in `@alfy2/core` that maintains a continuously-updated model of the enterprise and
runs what-if simulations against it. Deterministic, tenant-scoped.

### The model

The twin models the enterprise across its moving parts — **businesses, finances, assets, contacts, projects,
agents, workflows, campaigns, goals, risks** — and carries a computed **runway**. It is the live picture the
platform plans against: kept current as state changes, not assembled on demand.

### The what-if simulations

`simulate()` projects **four what-if scenarios** against the current twin: **hire**, **pause_business**,
**revenue_drop**, and **launch_offer**. Each projects the resulting **state and runway**, the **deltas** from
today, and a **recommendation**. The question is always the same shape — "if we did this, where would the
enterprise be?" — and the answer is a concrete projected state with a runway and a suggested call.

### Relationship to neighbours

The twin is the **basis for forecasting and planning**. It complements the **Control Tower**, which reads a
snapshot of where things stand, and the **Business Simulation Engine**, which compares option A against option
B — the twin instead holds the standing model both of those can be expressed against, and projects it forward
under a what-if.

### Contracts & data

`packages/shared/src/contracts/digital-twin.ts`: `TwinState`, `WhatIfKind`, `WhatIfInput`, `WhatIfProjection`,
`TwinSimulation`. Migrations `0097`/`0098` add the append-only `twin_snapshots` table + RLS. Smoke
`pnpm twin:smoke`.

## Consequences

- The platform holds a continuously-updated model of the enterprise — businesses, finances, assets, contacts,
  projects, agents, workflows, campaigns, goals, risks, plus runway — as the basis for forecasting and planning.
- Four what-if simulations (hire, pause_business, revenue_drop, launch_offer) project state, runway, deltas, and
  a recommendation, so planning questions get a concrete projected answer.
- Snapshots are append-only, so the twin's history is preserved for later comparison.
- It complements the Control Tower (read snapshot) and the Business Simulation Engine (A-vs-B) without
  duplicating either.
- Phase 2 keeps the twin current from the live engines and exposes `simulate()` to planning surfaces.
