# ADR-0016: Goal Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² already triages inbound work (Decision Engine), coordinates it (Chief of Staff), and observes
how the founder works (Pattern Engine). What was missing was the layer that holds a *desired outcome*
over time and keeps driving toward it. The founder thinks in goals — personal, financial, business,
health, learning, relationships, launches, sales, cash flow — and wants each one turned into a concrete,
continuously-pursued plan that recalculates when things change and never quietly stalls.

## Decision

Add a `goal/` engine in `@alfy2/core` that turns a goal into an analyzed, planned, continuously-pursued
object. It composes existing engines rather than duplicating them, and is deterministic (no AI).

### For every goal the engine determines

current state, desired state, the gap, constraints, resources, best opportunities, and **three
candidate paths** — `fastest` (reuse what exists), `lowest_resistance` (warm channels, low friction),
and `highest_roi` (build the compounding asset) — plus a recommended path. The recommendation is rule-
based and explainable: a near deadline favors *fastest*, hard constraints favor *lowest-resistance*,
and ample room favors *highest-ROI*.

### And it generates

a weekly plan, daily priorities, recommended agents, recommended automations, an expected completion
date, and a risk analysis. Priority, recommended agents, and automation opportunities come from the
**Decision Engine** (the goal is fed in as a decision input); the plan module shapes them and derives
risks from the chosen path and the goal's constraints.

### Lifecycle

A goal is `draft` until approved. An approved goal is `active` — actively pursued — and **stays pursued
until it is `completed`, `paused`, `cancelled`, or `review_required`**. The engine never stops pursuing
an approved goal on its own. When a goal changes (`recalculate`, or `recordProgress` below target), the
engine **automatically recalculates** — re-analyzes, re-plans, and bumps `version`. Recording progress
that reaches the target auto-completes the goal. A `review_required` goal resumes to `active` when a
recalculation resolves the review. `completed` and `cancelled` are terminal.

### Contracts & data

`packages/shared/src/contracts/goal.ts`: `GoalType` (9), `GoalStatus`, `PathKind`, `GoalPath`,
`Constraint`/`Resource`/`Opportunity`, `RiskItem`, `WeeklyPlanItem`, `GoalAnalysis`, `GoalPlan`, `Goal`,
`CreateGoalInput`, `GoalChange`. Mirrored in Pydantic. Migration 0020 adds the `goals` table (analysis
and plan as `jsonb`, `version`, status/type CHECKs) + 0021 deny-by-default RLS.

## Consequences

- The founder gets one place where an outcome becomes a plan and stays driven — with an explicit
  fastest / lowest-resistance / highest-ROI choice rather than a single opinionated route.
- Goals are self-healing: a change recalculates the plan instead of going stale, and the version trail
  records every recalculation.
- An approved goal can only leave pursuit through the four named exits, matching the requirement that
  Alfy² "never stop pursuing approved goals."
- The engine reuses the Decision Engine for priority/agents/automations — no scoring logic is
  duplicated. Persisting goals to Supabase and running the recalculation loop on a schedule is Phase 2.
