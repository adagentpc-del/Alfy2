# ADR-0059: Continuous Improvement Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Workflows accumulate, and not all of them earn their place. Some are slow, some unreliable, some duplicate
others, some should never have been built. Principle 10 — continuously improve — needs a mechanism: a standing
evaluator that scores every workflow on the dimensions that matter and recommends a concrete change, prioritized
by where improvement pays off most. The Reflection Engine reviews periods and Workflow ROI Tracking measures
value; what is missing is a per-workflow improvement recommender. This ADR adds it.

## Decision

Add a `continuous-improvement/` engine in `@alfy2/core` that evaluates every workflow and recommends a concrete
improvement for each, ranked by expected payoff. Deterministic, tenant-scoped.

### Scoring every workflow

Each workflow is scored on six dimensions — **speed, quality, cost efficiency, conversion, reliability,** and
**user ease** — and its **health** is their mean. The six dimensions are the axes a workflow can be good or bad
on; the mean is the single number that says how well it is doing overall.

### The recommendation

For each workflow the engine recommends one move: **simplify, automate, remove, merge, split, delegate.** Every
recommendation carries an **expected impact** and a **confidence**, and recommendations are sorted by
**impact × confidence** so the highest-leverage, best-supported change comes first. `worstFirst` orders by
health ascending, prioritizing the workflows **where improvement matters most**. Re-evaluating a workflow
**upserts** — the latest evaluation replaces the prior one rather than accumulating duplicates.

### Relationship to neighbours

The engine **complements** **Workflow ROI Tracking** (ADR-0023), which measures value and cost, and the
**Reflection Engine** (ADR-0053), which reviews periods — continuous improvement is the per-workflow recommender
that turns those signals into a specific change per workflow, ranked by payoff.

### Contracts & data

`packages/shared/src/contracts/continuous-improvement.ts`: `ImprovementDimension`, `WorkflowScore`,
`ImprovementMove`, `ImprovementRecommendation`. Migrations `0101`/`0102` add the `workflow_improvements` table +
RLS. Smoke `pnpm improve:smoke`.

## Consequences

- Every workflow is scored on speed, quality, cost efficiency, conversion, reliability, and user ease, with
  health as their mean, and gets one recommended move (simplify/automate/remove/merge/split/delegate).
- Recommendations carry expected impact and confidence and are sorted by impact × confidence; `worstFirst`
  prioritizes the lowest-health workflows where improvement matters most.
- Re-evaluation upserts, so each workflow holds one current recommendation rather than a growing pile.
- It complements Workflow ROI Tracking and the Reflection Engine, turning their signals into per-workflow change.
- Phase 2 runs the evaluator on a cadence and surfaces `worstFirst` into Mission Control.
