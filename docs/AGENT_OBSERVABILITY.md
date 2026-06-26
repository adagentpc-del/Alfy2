# Agent Observability

Agent Observability records **every agent action** with full provenance and rolls it up into
dashboards, so Alfy² can be trusted and audited as it runs more agents. It can always answer, for any
action: what did this agent do, why did it do that, what data did it use, and what changed afterward.
Deterministic. Tenant-scoped.

Module: `packages/core/src/agent-observability/`. Contracts:
`packages/shared/src/contracts/agent-observability.ts` (mirrored in `workers/`). Migrations:
`0030_agent_actions.sql`, `0031_agent_actions_rls.sql`. ADR: `docs/adr/ADR-0020-agent-observability.md`.
Smoke: `pnpm observability:smoke`.

## Every action, full provenance

`record()` appends an immutable `AgentActionRecord` capturing **agent name, task, input, tools used,
memory used, decision, rationale, approval status, cost, runtime, outcome, errors, and downstream
effects** — plus an attributed `value_usd` (for ROI) and a `risk_level`. The backing `agent_actions`
table is append-only (INSERT + SELECT only), so the trail can't be rewritten.

## The four questions

`explain(id)` answers them straight from the record:

| Question | Answered from |
| --- | --- |
| What did this agent do? | task + outcome + approval status (`agentTrace(name)` for the full trail) |
| Why did it do that? | the recorded decision + rationale |
| What data did it use? | tools used + memory used + input |
| What changed afterward? | downstream effects |

## Dashboards

`dashboard()` computes every view:

- **Agent performance** — actions, successes/failures, success rate, avg runtime, total cost, total value, ROI
- **Failed actions** — every failure or blocked action
- **Cost by agent** and **ROI by agent** (ROI = (value − cost) / cost, or null at zero cost)
- **Risky actions** — anything logged at high risk
- **Approval bottlenecks** — pending + rejected actions per agent
- **Repeated failures** — the same agent + task failing twice or more, with the last error

## Tenant isolation

Every method is tenant-scoped; records never cross tenants, matching the RLS on `agent_actions`.

## Wiring (Phase 2)

The recorder is in-memory today. Phase 2 has the orchestrator and every engine emit a record on each
action and persists them to `agent_actions`, then surfaces the dashboards in the UI.
