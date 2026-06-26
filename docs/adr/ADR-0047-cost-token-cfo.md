# ADR-0047: Cost & Token CFO

**Status:** Accepted
**Date:** 2026-06-25

## Context

Workflow ROI Tracking (ADR-0023) already computes value versus cost and ROI per automation and recommends
scale/pause/improve/delete. What it does not do is open the cost up: where the money goes, what each unit of
output actually costs, where break-even sits, and which concrete model or infrastructure move would lower the
bill. The mission asks for a CFO for the agentic spend — a control-plane capability that decomposes cost,
attaches it to revenue and saved time, and names the next economic move.

## Decision

Add a `cost-cfo/` engine in `@alfy2/core` that tracks the full cost stack of a workflow against the value it
produces and recommends cost moves. Deterministic, tenant-scoped, append-only.

### Six cost categories against value

Cost is tracked in six categories: **model, api, automation, tool_subscription, compute, and storage**. Value
is **revenue plus human time saved** (hours saved × an hourly rate). Per workflow the CFO computes **total
cost**, **total value**, **cost per task / per lead / per booked call / per sale** (each `null` when the
denominator is zero, never a divide-by-zero), **ROI** as `(value − cost) / cost`, the **break-even** point
(total cost — the value the workflow must clear to pay for itself), and the **largest cost category**.

### The recommendations

From the decomposition the CFO names a concrete move: **cheaper_model** or **local_model** when model spend is
at least 50% of cost; **batch_processing** at 100 or more tasks; **pause_expensive_agent** when ROI is
negative; **upgrade_when_roi_supports** when ROI is at least 2; and **better_workflow** when the margin is
thin. Each is a specific lever, not "spend less."

### Contracts & data

`packages/shared/src/contracts/cost-cfo.ts`: `CostCategory`, `CostBreakdown`, `WorkflowEconomics`,
`CostRecommendation`. Migrations `0081`/`0082` (append-only) add `workflow_costs`. This **complements**
Workflow ROI Tracking — that engine ranks workflows on ROI; this one explains the cost behind the ROI, gives
per-unit costs and break-even, and points at the model and infra changes that would move the number. It is a
Control Plane cost-control capability under the two-plane framing (ADR-0046).

## Consequences

- Spend is legible: the operator sees not just "this workflow is expensive" but which category dominates,
  what a sale costs, where break-even is, and the specific cheaper-model / batch / pause / upgrade move to
  make.
- Per-unit costs are honest about empty denominators (`null`, not zero or error), so a brand-new workflow
  reads as "no data yet" rather than "free."
- Phase 2 wires real metered token/api/compute usage into the categories behind the same surface.
