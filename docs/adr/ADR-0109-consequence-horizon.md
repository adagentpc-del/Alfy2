# ADR-0109: Consequence Horizon Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Most decisions are judged by their immediate result and nothing else, so their best (and worst) effects — the doors
they open or close years later — stay invisible. A founder optimizing only for immediate results trades away
long-term leverage without seeing the trade. The leverage is to project a decision's second- and third-order
consequences across several horizons, so the choice is made with its future in view. This ADR adds the Consequence
Horizon Engine.

## Decision

Add a `consequence-horizon/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`project()`**
estimates a decision's consequences across five horizons and returns a `ConsequenceProjection`.

### Five horizons, second- and third-order effects

The engine projects impact across **immediate, 30-day, 90-day, 1-year, and 5-year** horizons, estimating the
**second- and third-order consequences** at each — asking "if Alyssa makes this decision today, what doors open
later?" The invariant: the platform **optimizes for long-term leverage, not just immediate results** — a decision
that looks neutral today but compounds over a year, or one that pays off now but closes doors at five years, is
surfaced with its full horizon, so the founder is never blind to what follows.

### Contracts & data

`packages/shared/src/contracts/consequence-horizon.ts`: `Horizon`, `ProjectConsequencesInput`, `HorizonImpact`,
`ConsequenceProjection`. No migration — deterministic projection. Smoke `pnpm capstone:smoke`.

## Consequences

- Every decision is projected across **5 horizons** (immediate / 30-day / 90-day / 1-year / 5-year) with second-
  and third-order effects.
- The platform optimizes for long-term leverage, surfacing doors a decision opens or closes later.
- No migration — a pure projector.
- Phase 2 attaches projections to Agent Council verdicts and Decision Journal entries.
