# Simulation Engine

The Simulation Engine lets Alfy² model a major workflow before committing to it. Given something to
simulate, it returns a **best / likely / worst case**, the **risks**, a **recommendation**, and the
**decision the operator needs to make** — a cheap, explainable dry run instead of launching blind.
Deterministic (pure arithmetic over supplied parameters, no AI). Tenant-scoped.

Module: `packages/core/src/simulation/`. Contracts: `packages/shared/src/contracts/simulation.ts`
(mirrored in `workers/`). Migrations: `0032_simulations.sql`, `0033_simulations_rls.sql`. ADR:
`docs/adr/ADR-0021-simulation-engine.md`. Smoke: `pnpm simulation:smoke`.

## Eight kinds

`simulate(input)` models eight workflow kinds, each with its own deterministic projection:

| Kind | Headline metric |
| --- | --- |
| `campaign_outcome` | revenue from impressions × conversion × order value |
| `revenue_path` | compounded MRR over the horizon |
| `hiring_vs_automation` | net savings of automation vs a salary |
| `pricing_change` | revenue under price elasticity |
| `priority_shift` | projected value of concentrating effort |
| `cash_flow` | runway in months |
| `implementation_risk` | probability of a clean implementation |
| `agent_failure` | share of failures contained |

Parameters are loosely typed with sensible defaults, so a simulation runs even with partial inputs and
sharpens as better numbers are supplied.

## What every result contains

- **best / likely / worst** `ScenarioCase`s — each with its **assumptions**, a numeric **projection**, a
  **narrative**, and a **probability** (the three sum to 1)
- **risks** — each with likelihood, impact, and a mitigation
- **recommendation** — the one-line suggested path
- **decision_needed** — phrased as the actual choice (e.g. "approve the automation-first path, or commit
  to a hire now?")
- **expected_value** — the probability-weighted headline metric across the three cases

## Tenant isolation

Every method is tenant-scoped; simulations never cross tenants, matching the RLS on `simulations`.

## Pairs with the rest of the platform

Simulate a campaign before Campaign Intelligence launches it; simulate cash flow before the Security
Gate approves a spend; simulate hiring vs automation before the Goal Engine commits a plan. Wiring
those triggers is Phase 2; the engine and contract are ready now.
