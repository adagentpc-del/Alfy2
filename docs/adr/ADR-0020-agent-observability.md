# ADR-0020: Agent Observability

**Status:** Accepted
**Date:** 2026-06-25

## Context

As Alfy² runs more agents (and the Agent Factory keeps minting new ones), an operator needs to trust
and audit what those agents do. The platform must be able to answer, for any agent action: **what did
this agent do, why did it do that, what data did it use, and what changed afterward** — and roll the
whole population up into dashboards that show where to look.

## Decision

Add an `agent-observability/` engine in `@alfy2/core` that records **every agent action** as an
append-only, fully-provenanced log and aggregates it into dashboards. Deterministic. Tenant-scoped.

### Full provenance per action

`record()` stores an `AgentActionRecord` capturing exactly the required fields: **agent name, task,
input, tools used, memory used, decision, (rationale), approval status, cost, runtime, outcome,
errors, downstream effects** — plus an attributed `value_usd` (for ROI) and a `risk_level`. Records
are immutable; the backing `agent_actions` table is append-only (INSERT + SELECT RLS only).

### The four questions

`explain(id)` returns an `ActionExplanation` answering the four questions directly from the record:

- **What did this agent do?** → task + outcome + approval status (also `agentTrace(name)` for the full trail)
- **Why did it do that?** → the recorded decision + rationale
- **What data did it use?** → tools used + memory used + input
- **What changed afterward?** → downstream effects

### Dashboards

`dashboard()` computes every required view: **agent performance** (actions, successes/failures,
success rate, avg runtime, total cost/value, ROI), **failed actions**, **cost by agent**, **ROI by
agent**, **risky actions** (risk = high), **approval bottlenecks** (pending + rejected per agent), and
**repeated failures** (the same agent + task failing 2+ times, with the last error). ROI is
`(value − cost) / cost`, or null when cost is zero.

### Contracts & data

`packages/shared/src/contracts/agent-observability.ts`: `AgentActionRecord`, `LogAgentActionInput`,
`ActionApprovalStatus`, `ActionOutcome`, `ActionRiskLevel`, `AgentPerformance`, `RepeatedFailure`,
`ApprovalBottleneck`, `ObservabilityDashboard`, `ActionExplanation`. Mirrored in Pydantic. Migration
0030 adds the append-only `agent_actions` table + 0031 deny-by-default RLS.

## Consequences

- Every agent action leaves an immutable, queryable trail — the platform can always explain itself.
- The dashboards make the population legible: which agents earn their cost, which keep failing, which
  take risky actions, and where approvals are piling up.
- The `value_usd` / `cost_usd` capture makes ROI a first-class, per-agent number — directly useful for
  deciding which agents to keep, fix, or retire.
- Wiring the orchestrator and every engine to emit a record on each action (and surfacing the dashboard
  in the UI) is Phase 2; the contract and aggregation are ready now.
