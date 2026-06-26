# ADR-0092: Executive Review Board

**Status:** Accepted
**Date:** 2026-06-25

## Context

A solo founder makes board-level decisions without a board — and so without the independent, role-specific
scrutiny that catches what a single perspective misses. The CFO's worry about cash, the CLO's worry about
liability, the CMO's read on positioning: each is a lens the founder cannot hold all at once. The leverage is in
manufacturing that board — a set of role-specific evaluators that each judge a decision through their own lens,
and then a synthesis that *highlights* where they disagree rather than papering over it. A board that forces
consensus loses its value. This ADR adds the Executive Review Board to give the founder that scrutiny.

## Decision

Add a `review-board/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It runs a virtual board of **ten
roles**, each independently evaluating a decision through its lens, then **synthesizes a final recommendation that
highlights disagreements** rather than forcing consensus.

### Ten roles, ten lenses

The board seats ten roles — **CEO, CFO, COO, CTO, CMO, CLO, CRO, CSO, CPO, CCO** — and each evaluates the decision
independently through its own concern: **benefits, risks, blind spots, dependencies, costs, and operational
impact** as that role sees them. The CFO weighs cost and cash, the CLO weighs liability and compliance, the COO
weighs operational drag, and so on — so a decision is examined from ten angles a single founder could never hold
simultaneously.

### Synthesis that highlights disagreement

From the ten independent evaluations the engine synthesizes a **final recommendation** — but it does not average
the board into bland agreement. It **highlights the disagreements**: where the CRO and the CFO pull in opposite
directions, where one role sees a blind spot another ignores. Forcing consensus would hide exactly the tension the
founder most needs to see, so the engine surfaces it. The board advises; the human, in command, decides.

### Contracts & data

`packages/shared/src/contracts/review-board.ts`: `BoardRole`, `RoleEvaluation`, `BoardSynthesis`, `Disagreement`,
`ReviewBoardResult`. Migrations `0170`/`0171` store role evaluations and the synthesized recommendation
**append-only**, preserving the board's reasoning on each decision. Smoke `pnpm board:smoke`.

## Consequences

- A virtual board of ten roles (CEO / CFO / COO / CTO / CMO / CLO / CRO / CSO / CPO / CCO) evaluates each decision
  independently through its lens — benefits, risks, blind spots, dependencies, costs, operational impact.
- The synthesis highlights disagreements rather than forcing consensus, surfacing the tension the founder most
  needs to see.
- The board advises; the human decides — it never takes command.
- Evaluations and the synthesized recommendation are append-only (`0170`/`0171`), preserving the board's reasoning.
- Phase 2 wires the board ahead of major decisions and feeds its disagreements into the Decision Journal.
