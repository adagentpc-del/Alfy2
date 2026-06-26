# ADR-0021: Simulation Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Several of Alfy²'s actions are expensive or hard to reverse — launching a campaign, changing prices,
hiring instead of automating, shifting business priorities, spending against a thin runway. Before the
operator commits to a major workflow, the platform should let her *see the range of outcomes* and the
decision she actually has to make, rather than launching blind.

## Decision

Add a `simulation/` engine in `@alfy2/core` that, given a workflow to model, returns a **best / likely
/ worst case**, the **risks**, a **recommendation**, and the **decision needed**. Deterministic — pure
arithmetic over supplied parameters, no AI. Tenant-scoped.

### Eight kinds

`simulate(input)` covers the eight requested workflow kinds: **campaign outcomes, revenue paths,
hiring vs automation, pricing changes, business priority shifts, cash-flow scenarios, implementation
risks, and agent behavior under failure.** Each has its own deterministic model (`models.ts`) that
reads loosely-typed parameters with sensible defaults and projects a headline metric (revenue,
net savings, runway months, success probability, contained-failure share, …).

### Output shape

Every simulation returns three `ScenarioCase`s — best, likely, worst — each with its **assumptions**, a
numeric **projection**, a **narrative**, and a **probability** (the three sum to 1). On top of the
cases it returns the **risks** (likelihood × impact × mitigation), a one-line **recommendation**, the
**decision needed** (phrased as the actual choice — e.g. "approve the automation-first path, or commit
to a hire now?"), and a probability-weighted **expected value** of the headline metric.

### Contracts & data

`packages/shared/src/contracts/simulation.ts`: `SimulationKind`, `CaseLabel`, `ScenarioCase`,
`SimRisk`, `SimulationInput`, `SimulationResult`. Mirrored in Pydantic. Migration 0032 adds the
`simulations` table (cases/risks as `jsonb`) + 0033 deny-by-default RLS.

## Consequences

- Major workflows get a cheap, explainable dry run before any money or reputation is spent — three
  framed cases instead of a single point estimate.
- Each result ends with the *decision the operator needs to make*, so a simulation leads directly to a
  go/no-go rather than just a chart.
- The models are deterministic and parameter-driven, so results are reproducible and auditable; better
  parameter sources (live financials, campaign history) plug in without changing the contract.
- This pairs naturally with the rest of the platform: simulate a campaign before Campaign Intelligence
  launches it, simulate cash flow before the Security Gate approves a spend. Wiring those triggers is
  Phase 2.
