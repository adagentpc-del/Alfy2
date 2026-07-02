# Automation Orchestration — Spec

The layer that makes the machine run on its own clock. The **planning/dispatch core exists**
(`packages/core/src/orchestration/`: planner, assembler, dispatcher, approval-gate); what's missing is the
**runtime** — `services/orchestrator` is a README stub, so today nothing schedules, retries, or runs
unattended. This spec defines that runtime.

**Existing machinery:** core `orchestration/*` (dispatcher already has a real `HttpAgentTransport`),
`connector-registry` (descriptors + blueprints; ADR-0012), `model-router` (ADR: provider-agnostic model
selection — catalog-based, no live LLM calls yet), `execution-queue` (8 buckets, priority order),
`nervous-system`, `workflow-roi` (ADR-0023), Control/Execution planes guard (ADR-0046),
`agent-observability`. Workers: `workers/alfy_workers` skeleton reachable via `WORKERS_BASE_URL`.

## Runtime design (`services/orchestrator`)

A small Node service (same stack as `services/api`) that owns three loops:

1. **Scheduler** — cron-style cadence jobs from `docs/AGENT_OPERATING_CADENCE.md`. Each job: named,
   tenant-scoped, **idempotent per (job, tenant, period)** — reruns are safe. First jobs:
   daily-brief (`/mission-control/brief`), approval-expiry sweep, dont-drop-ball scan, knowledge-sync run.
2. **Queue worker** — drains the execution queue: takes the highest-priority actionable item, assembles an
   execution packet, dispatches to the owning agent/tool via the dispatcher. Blocked and waiting-on-Alyssa
   items are skipped, never forced.
3. **Watcher** — job statuses: `queued → running → succeeded / failed / parked_for_approval`. Failures
   retry with backoff (bounded), then escalate as Mission Control alerts. Every transition is logged.

## The execution packet (the unit of automation)

What the planner/assembler already produce: goal, steps, owning agent title, tool/connector refs, inputs
by reference, **approval class per step**, expected outputs, and reporting target. Packets route through
the same chain of command as human-delegated work — automation gets no special authority.

## Non-negotiable boundaries

1. **The gate is in the loop, not around it**: any step whose action class is gated parks the packet at
   that step (`parked_for_approval`) and surfaces in the Approval Center. Automation never pre-approves.
2. **Mock adapters first**: a connector descriptor without a proven mock adapter cannot be dispatched to
   live (`registry` refuses; live requires the adapter to declare its mock-smoke).
3. **No secrets in packets** — connector auth is resolved at dispatch from env, referenced by key name.
4. **Everything observable**: every job run and packet step lands in agent observability with cost; the
   workflow-ROI engine prices each automation so `scale/pause/delete` stays data-driven.
5. **Kill switch**: a per-tenant `automation_paused` flag stops the scheduler and worker loops instantly;
   Mission Control shows orchestrator health (last tick, queue depth, failure rate).

## Build order

1. Orchestrator service skeleton + scheduler + **daily-brief job** (Day 4 of
   `docs/FIVE_DAY_COMPLETION_PLAN.md`) — proves cadence, idempotency, logging.
2. Approval-expiry sweep + dont-drop-ball scan.
3. Queue worker over the execution queue with mock connectors.
4. First live connector dispatch (Move Mi email ingest) once its mock workflow is demo-proven.
