# ADR-0066: Algorithm Overlay System

**Status:** Accepted
**Date:** 2026-06-25

## Context

The platform already has agents, workflows, goals, businesses, campaigns, and tasks — but the executive question
that cuts across all of them is "what should I prioritize, and why?" Answering it well needs a transparent,
consistent scoring layer that sits *above* those objects and ranks them by the same legible algorithms every
time, rather than ad-hoc judgment scattered through each engine. This ADR adds the Algorithm Overlay System: a
catalog of fifteen transparent scoring algorithms that score the objects beneath them and always explain
themselves.

## Decision

Add an `algorithm-overlay/` engine in `@alfy2/core` that applies fifteen scoring algorithms over the platform's
core objects. Deterministic, tenant-scoped. Every score is transparent — it carries its reasoning, the data it
used, and what it lacked.

### Fifteen transparent algorithms

The overlay holds **fifteen algorithms**: **priority, ROI, fastest path to cash, friction, conversion
probability, agent-need detection, opportunity matching, business health, goal gap, risk, pattern prediction,
energy-aware scheduling, knowledge-to-money, portfolio allocation, and A/B-test winner.** They score across
agents, workflows, goals, businesses, campaigns, and tasks — one consistent scoring layer over everything the
platform manages, rather than a private heuristic inside each engine.

### Phased, and always explained

Each score is a number in **0..1** carrying its **confidence**, its **why**, the **`data_used`**, the
**`data_missing`**, a **`recommended_action`**, a **`requires_approval`** flag, and an **override** option —
so a ranking is never a black box and the human can always overrule it. The algorithms are **Phase 1
rules-based**, and the design graduates each one through phases — **rules → weighted → historical →
predictive** — so the overlay earns sophistication over time without ever losing its transparency.

### Contracts & data

`packages/shared/src/contracts/algorithm-overlay.ts`: `AlgorithmId`, `OverlayScore`, `OverlayInput`,
`OverlayResult`, `ScorePhase`. There is **no migration** — the algorithm catalog is static and the scores are
computed read-models over existing objects, holding no state of their own. Smoke `pnpm overlay:smoke`.

## Consequences

- The platform has one scoring layer: fifteen transparent algorithms ranking agents, workflows, goals,
  businesses, campaigns, and tasks consistently.
- Every score is explainable — 0..1 with confidence, why, data_used, data_missing, recommended_action,
  requires_approval, and an override — so rankings are never opaque and the human can always overrule them.
- The algorithms graduate through phases (rules → weighted → historical → predictive); Phase 1 is rules-based.
- There is **no migration** — a static catalog plus computed scores over existing objects.
- Phase 2 wires the overlay's recommended actions, behind their requires_approval flags, into the Execution
  Queue and the executive views.
