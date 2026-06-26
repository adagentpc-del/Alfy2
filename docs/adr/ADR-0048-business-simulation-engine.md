# ADR-0048: Business Simulation Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The Simulation Engine (ADR-0021) models a *single* scenario across best/likely/worst cases — it answers "how
might this one decision play out?" The mission also needs the other shape of question: "given two options, A
or B, which should we pick?" That is a comparator, not a single-scenario model, and it has to weigh more than
expected revenue — the founder's stress and time are real costs of a choice. This ADR adds that comparator.

## Decision

Add a `business-simulation/` engine in `@alfy2/core` that compares two decision options and recommends a
winner. Deterministic, tenant-scoped, append-only. Distinct from the scenario Simulation Engine.

### Six decision kinds, two options

The engine compares an A versus B across six decision kinds: **focus_choice, campaign_choice,
hire_vs_automate, pricing_choice, lead_focus, and build_vs_sell**. Each option is a `DecisionOption` carrying
**projected_revenue, probability, time_cost_days, stress_cost, and risk**.

### Projection and scoring

Each option is projected to **best / likely / worst** with an **expected value** of `projected_revenue ×
probability`. It is then scored on a composite that weighs that expected value **against** risk, stress, and
time — an option that promises more but costs more days, more stress, and more risk can lose to a calmer,
faster one. The engine **recommends the higher-scoring option** and gives the **reason** the score came out
that way.

### Distinct from the Simulation Engine

ADR-0021 models one scenario's three cases and returns a single recommendation about that scenario. This
engine takes two fully specified options and **picks a winner between them**, and it adds two costs the
scenario model does not carry — **stress_cost** and **time_cost** — because choosing between paths is where
those costs actually bite.

### Contracts & data

`packages/shared/src/contracts/business-simulation.ts`: `DecisionKind`, `DecisionOption`, `OptionProjection`,
`DecisionComparison`. Migrations `0083`/`0084` (append-only) add `decision_comparisons`.

## Consequences

- A/B business decisions get a structured, repeatable answer that values stress and time alongside money,
  rather than defaulting to the bigger revenue number.
- It informs decisions; it does not execute them — the recommendation and its reason feed the operator and
  the decision surfaces, and any resulting action still goes through the Control Plane.
- Phase 2 can feed live pipeline, capacity, and historical-outcome data into the projections behind the same
  `compare()` surface.
