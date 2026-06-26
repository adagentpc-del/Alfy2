# ADR-0097: Confidence-Weighted Agent Council

**Status:** Accepted
**Date:** 2026-06-25

## Context

For the highest-impact decisions — entity restructuring, large spending, a major launch — a single recommendation
is not enough; what matters is whether independent evaluators agree, how confident they are, and whether they are
deciding on enough data. The Executive Review Board (ADR-0092) already convenes ten C-suite lenses and highlights
disagreement. The L0 stack needs a sharper instrument: a council whose verdict is *weighted by confidence* and
that refuses to decide when it lacks data. This ADR adds the Confidence-Weighted Agent Council.

## Decision

Add an `agent-council/` engine in `@alfy2/core`. Deterministic, tenant-scoped. Its core method **`convene()`** runs
**ten roles** — CEO, CFO, COO, CTO, CMO, legal_risk, security, customer, investor, contrarian — each producing an
independent, confidence-scored `CouncilOpinion`, then synthesizes a `CouncilVerdict`.

### Ten opinions, weighted by confidence

Each role returns a recommendation (proceed / proceed_with_conditions / reject), a **confidence (0..1)**, plus
risks, assumptions, missing information, and expected upside/downside. The Orchestrator synthesizes them into
**`agreement`** (mean confidence), **`confidence_gap`** (spread between most and least confident), the union of
**`unresolved_risks`**, and **`needs_more_data`** — set true when `data_completeness` is too low to decide. The
invariant: a council short on data does not manufacture a verdict; it asks for more.

### Relationship to the Review Board

It **complements the Executive Review Board** (ADR-0092): the Review Board seats the C-suite to surface
*disagreement* on board-level calls; the Agent Council adds *confidence weighting* and a *data-sufficiency* gate
for the highest-impact decision kinds. Same instinct — manufacture independent scrutiny — different instrument.

### Contracts & data

`packages/shared/src/contracts/agent-council.ts`: `CouncilRole`, `CouncilDecisionKind`, `CouncilSignals`,
`ConveneCouncilInput`, `CouncilOpinion`, `CouncilVerdict`. Migration `0175_council_verdicts.sql` (append-only `council_verdicts`). Smoke
`pnpm capstone:smoke`.

## Consequences

- Ten roles evaluate the highest-impact decisions independently, each with a confidence score.
- The verdict reports agreement, confidence_gap, unresolved_risks, and needs_more_data — and declines to decide
  when data is insufficient.
- It complements the Review Board (ADR-0092): confidence weighting plus a data-sufficiency gate.
- Phase 2 convenes the council ahead of the eight high-impact decision kinds and feeds verdicts to the Decision Journal.
