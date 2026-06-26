# ADR-0100: Million-Dollar Sprint Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

When cash is the constraint, a founder needs an aggressive but *honest* path to it — not a motivational spreadsheet
that assumes every deal closes. The danger is fantasy math: a plan that reaches the target only by ignoring
probability, effort, and risk. The leverage is to rank real cash paths by what actually drives speed-to-cash and to
force every path to show its assumptions, risks, and required actions. This ADR adds the Million-Dollar Sprint
Engine.

## Decision

Add a `million-sprint/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`build()`** takes a
set of cash paths and a target (default $1,000,000 in available cash) and returns a `SprintPlan` of **ranked cash
paths** with 7/30/90-day plans.

### Ranked paths, no fantasy math

Each path is ranked on **speed to cash, deal size, probability, effort, legal/compliance risk, relationship
leverage, asset readiness, and founder energy**. The hard invariant is **no fantasy math**: every path must carry
its **assumptions, risks, and required actions**, and the plan is built from probability-weighted cash, not gross
deal sizes — so the path that *looks* biggest does not win unless it survives its own assumptions. The output is
the ordered set of paths plus the 7/30/90-day actions to walk them.

### Contracts & data

`packages/shared/src/contracts/million-sprint.ts`: `CashPathInput`, `BuildSprintInput`, `RankedCashPath`,
`SprintPlan`. Migration `0177_sprint_plans.sql` (append-only `sprint_plans`). Smoke `pnpm capstone:smoke`.

## Consequences

- Cash paths are ranked on speed, deal size, probability, effort, legal risk, relationship leverage, asset
  readiness, and founder energy, with 7/30/90-day plans.
- No fantasy math: every path shows assumptions, risks, and required actions, and ranking is probability-weighted.
- Migration `0177_sprint_plans.sql` (append-only `sprint_plans`).
- Phase 2 feeds Revenue Truth deals and Deal Desk opportunities into `build()` as candidate paths.
