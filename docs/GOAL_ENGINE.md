# Goal Engine

The Goal Engine turns a desired outcome into a plan that Alfy² pursues continuously. It is the layer
that holds a goal over time, drives toward it, recalculates when things change, and never quietly
stalls. It composes the engines already built — the Decision Engine for priority, recommended agents,
and automations — and is fully deterministic (no AI).

Module: `packages/core/src/goal/`. Contracts: `packages/shared/src/contracts/goal.ts` (mirrored in
`workers/`). Migrations: `0020_goals.sql`, `0021_goals_rls.sql`. ADR: `docs/adr/ADR-0016-goal-engine.md`.
Smoke: `pnpm goal:smoke`.

## Goal types

Nine kinds: **personal, financial, business, health, learning, relationships, launches, sales, cash
flow.** The type shapes the default opportunities, the default agent, and the recommended path.

## What the engine determines for every goal

- **current state**, **desired state**, and the **gap** (numeric when a metric/target is given — e.g.
  "$28,000 of MRR to close" — otherwise descriptive)
- **constraints** (with low/medium/high severity inferred from the text)
- **resources** (classified as time / money / people / tool / knowledge / relationship)
- **best opportunities** (the leverage points, ranked)
- **three candidate paths**, always:
  - **fastest** — reuse existing demand and resources; shortest, medium risk
  - **lowest-resistance** — warm channels and habits; low friction, low risk, slower
  - **highest-ROI** — build the compounding asset; highest return, higher up-front cost and risk
- a **recommended path**, chosen by explainable rule: near deadline → fastest; hard constraint →
  lowest-resistance; ample room → highest-ROI.

## What the engine generates

A **weekly plan** (focus + milestones per week), **daily priorities**, **recommended agents**,
**recommended automations**, an **expected completion** date, and a **risk analysis** (each risk with
likelihood, impact, and a mitigation) plus a summary. Priority, agents, and automations are sourced
from the Decision Engine by feeding the goal in as a decision input.

## Lifecycle — pursued until it isn't

```
draft ──approve──▶ active ──complete──▶ completed (terminal)
  ▲                  │  │ │
  │            pause │  │ └─requireReview─▶ review_required ──recalculate──▶ active
  └──approve── paused   └─cancel──▶ cancelled (terminal)
```

- A goal is **draft** until approved; approval makes it **active** (pursued).
- **An approved goal stays pursued until it is completed, paused, cancelled, or review_required.** The
  engine never stops pursuing it on its own. `activeGoals(tenant)` returns exactly the pursued set.
- **Change → automatic recalculation.** `recalculate(tenant, id, change)` re-analyzes, re-plans, and
  bumps `version` (with `last_recalculated_at`). A `review_required` goal resumes to `active` when a
  recalculation resolves the review.
- **Progress.** `recordProgress(tenant, id, value)` updates the current value; reaching the target
  **auto-completes** the goal, otherwise it recalculates the plan around the new gap.
- **completed** and **cancelled** are terminal — they reject further approval, recalculation, or
  progress.

## Tenant isolation

Every method is tenant-scoped; goals never cross tenants, matching the RLS on the `goals` table.

## Wiring (Phase 2)

The engine is in-memory today. Phase 2 persists goals to the `goals` table and runs the recalculation
loop on a schedule, so active goals are re-planned automatically as their inputs drift.
