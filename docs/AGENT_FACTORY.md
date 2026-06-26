# Alfy² — Agent Factory

Alfy²'s self-extension layer. When a responsibility recurs, the factory recommends a new agent; after
operator approval it generates the agent in full and registers it so the orchestrator can use it
immediately. Decision record: [`adr/ADR-0005`](./adr/ADR-0005-agent-factory.md).

## The lifecycle
```
recurring Decisions ──▶ recommend() ──▶ draftBlueprint() ──▶ [operator approves] ──▶ generate()
                         AgentRecommendation   AgentBlueprint        approved=true     GeneratedAgent
                                                                                         │
                                            writer ◀── files to disk ──┐   registry ◀── registration
                                                                       └── orchestrator can dispatch now
```

1. **Detect** — `recommend(decisions)` groups recent Decision Engine output by signature (primary
   category + the agent the work keeps routing to). A signature at/above the threshold becomes an
   `AgentRecommendation` (rationale, frequency, evidence, suggested capabilities/tools, confidence).
2. **Draft** — `draftBlueprint(rec)` produces a complete, **un-approved** `AgentBlueprint` with safe
   defaults (memory scope, least-privilege permissions, success metrics, dashboard card, task queue).
3. **Approve** — the operator reviews/edits and sets `approved: true`. Generation is **refused**
   (`AgentApprovalError`) until then.
4. **Generate** — `generate(blueprint, { writer?, registry? })` materializes the agent and registers it.

## What `generate()` produces (a `GeneratedAgent`)
Every item the brief called for:

| Output | Where |
|---|---|
| folder | `workers/alfy_workers/<family>/` |
| configuration | `<family>/config.json` |
| instructions | `<family>/INSTRUCTIONS.md` |
| memory scope | `memory_scope` (kinds, read/write, max items) + in config |
| permissions | `permissions` (network, irreversible, approval-required) + in config |
| tools | `tools` (declared) + in config |
| success metrics | `success_metrics` + in config |
| dashboard card | `dashboard_card` (goes `active` on generation) |
| task queue | `task_queue` (name, concurrency, retries) |
| testing | `<family>/test_agent.py` |
| documentation | `docs/agents/<family>.md` |
| worker stub | `<family>/agent.py` (implements the Task contract) |
| registration | `AgentRegistration` — makes it live to the orchestrator |

## Immediately available to the orchestrator
Passing a `registry` (the Agent Registry) to `generate()` registers the new `AgentRegistration`. The
Dispatcher resolves agents by key, so the moment registration completes the orchestrator can route
Tasks to the new agent. The smoke test proves this: it generates, registers, then dispatches a Task to
the freshly-created agent.

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/agent-factory.ts` (+ Pydantic mirror in `workers/`) |
| Factory | `packages/core/src/agent-factory/factory.ts` |
| Recurrence detector | `packages/core/src/agent-factory/detector.ts` |
| File templates | `packages/core/src/agent-factory/templates.ts` |
| Smoke test | `scripts/agent-factory-smoke.mts` (`pnpm run factory:smoke`) |

## Boundaries
- **Approval-gated.** `generate()` throws unless `blueprint.approved` is true.
- **Infra-free core.** Files are written via a `FileWriter` port; the agent is made live via an
  `AgentRegistrar` port (the Agent Registry). The factory touches no disk or network itself.
- Generated workers are correct-by-shape stubs (contract, scope, permissions, queue, tests, docs);
  the capability logic is implemented afterward. An AI-assisted drafter can slot in behind the same
  ports without changing the contracts or the gate.
