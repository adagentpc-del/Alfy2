# ADR-0023: Workflow ROI Tracking

**Status:** Accepted
**Date:** 2026-06-25

## Context

As Alfy² automates more, the question shifts from "can we automate this?" to "is this automation worth
keeping?" The platform needs to measure the value each automation creates against what it costs, rank
automations, and say plainly which to **scale, pause, improve, or delete** — so effort flows to what
pays off and dead weight is cut.

## Decision

Add a `workflow-roi/` engine in `@alfy2/core`. For each automation it tracks the metrics, computes an
ROI, ranks workflows, and recommends an action. Deterministic. Tenant-scoped.

### Tracked metrics

`WorkflowMetrics` captures exactly the requested inputs: **time saved, revenue generated, cost reduced,
errors reduced, risk reduced, conversion improvement, operating cost, model/tool cost, and human time
required.**

### Value, cost, ROI

`track()` converts the metrics into money using a human hourly rate:

- **value** = revenue generated + cost reduced + (time saved × rate)
- **cost** = operating cost + model/tool cost + (human time × rate)
- **net value** = value − cost; **ROI** = net / cost (null when cost is zero)

### Recommendation

From net value, ROI, and the metric mix:

- **scale** — net positive at ROI ≥ 2x (a clear winner)
- **delete** — net negative with no revenue or cost savings (costs more than it returns)
- **improve** — net positive but ROI is thin (fix cost/output before scaling)
- **pause** — marginal or negative with some redeeming value (reassess rather than invest)

`rank()` orders workflows by ROI; `byRecommendation()` filters them. Re-tracking a workflow by name
upserts, so the ranking stays current.

### Contracts & data

`packages/shared/src/contracts/workflow-roi.ts`: `WorkflowMetrics`, `RoiRecommendation`,
`WorkflowRoiRecord`, `TrackWorkflowInput`. Mirrored in Pydantic. Migration 0036 adds `workflow_roi` +
0037 deny-by-default RLS.

## Consequences

- Automations are judged on outcomes, not novelty — the platform can defend or cut each one with a
  number and a rationale.
- The four recommendations turn the ranking into a decision: scale the winners, fix the thin ones,
  pause the marginal ones, delete the losers.
- It pairs naturally with Agent Observability (which supplies real cost/value per action) — Phase 2
  feeds observed metrics straight into `track()` and runs the ranking on a schedule.
