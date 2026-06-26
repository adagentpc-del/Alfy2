# Workflow ROI Tracking

Workflow ROI Tracking measures what every automation is worth. It weighs the value an automation
creates against what it costs, computes an ROI, ranks all automations, and recommends whether to
**scale, pause, improve, or delete** each one — so effort flows to what pays off and dead weight gets
cut. Deterministic. Tenant-scoped.

Module: `packages/core/src/workflow-roi/`. Contracts: `packages/shared/src/contracts/workflow-roi.ts`
(mirrored in `workers/`). Migrations: `0036_workflow_roi.sql`, `0037_workflow_roi_rls.sql`. ADR:
`docs/adr/ADR-0023-workflow-roi-tracking.md`. Smoke: `pnpm roi:smoke`.

## What's tracked

For every automation: **time saved, revenue generated, cost reduced, errors reduced, risk reduced,
conversion improvement, operating cost, model/tool cost, and human time required.**

## Value, cost, ROI

`track()` turns the metrics into money using a human hourly rate:

- **value** = revenue generated + cost reduced + (time saved × rate)
- **cost** = operating cost + model/tool cost + (human time × rate)
- **net value** = value − cost
- **ROI** = net value / cost (null when cost is zero)

## The recommendation

| Recommendation | When |
| --- | --- |
| **scale** | net positive at ROI ≥ 2x — a clear winner |
| **improve** | net positive but ROI is thin — fix cost/output before scaling |
| **pause** | marginal or negative with some redeeming value — reassess |
| **delete** | net negative with no revenue or cost savings — costs more than it returns |

`rank()` orders all automations by ROI; `byRecommendation()` filters them (e.g. "show me everything to
delete"). Re-tracking a workflow by name upserts, so the ranking always reflects the latest numbers.

## Tenant isolation

Every method is tenant-scoped; records never cross tenants, matching the RLS on `workflow_roi`.

## Pairs with Agent Observability

Agent Observability already captures real per-action cost and attributed value. Phase 2 feeds those
observed metrics straight into `track()` and runs the ranking on a schedule, so the scale/pause/improve/
delete calls stay current automatically.
