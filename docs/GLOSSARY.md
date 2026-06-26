# Alfy² — Glossary

Shared vocabulary. Use these exact terms in code, docs, and commits.

| Term | Meaning |
|---|---|
| **Operator** | The human Alfy² works for; the sole approver of irreversible actions. |
| **Module** | A domain capability (finance, health, projects…). Registered, replaceable, owns no infra directly. |
| **Agent** | A stateless executor (research, draft, classify…) invoked only through the Task contract. Lives in `workers/`. |
| **Capability** | A named action a module offers or an agent can perform (e.g. `summarize`, `plan_cashflow`). |
| **Task** | The envelope the core sends an agent: who, what capability, input, budget, trace. |
| **Signal → Action** | The universal output envelope: *what changed, why it matters, what to do next* + explanation. |
| **Plan** | An ordered set of Tasks a module produces from an operator intent. |
| **Planner** | The orchestrator component that turns intent + module output into a Plan. |
| **Dispatcher** | The orchestrator component that sends Tasks to agents and enforces the Approval Gate. |
| **Approval Gate** | The control that halts irreversible actions until the operator approves. |
| **Event Log** | Append-only record of everything that happened (`events` table). |
| **Decision Log** | The planner's choices and rationale (`decisions` table). |
| **Memory / Profile** | Durable operator context that personalizes plans (`memory` table). |
| **Registry** | The list of installed modules (`module_registry`) or agents (`agent_registry`). |
| **AI Gateway** | The single chokepoint (`packages/core/ai`) all model calls pass through (flag→cache→budget→usage). |
| **Tenant** | Isolation root. Single-operator mode = one tenant. Many tenants = FounderOS. |
| **FounderOS** | The future multi-tenant SaaS productization of Alfy². |
| **Reversible / Irreversible** | Action property; irreversible actions require the Approval Gate. |
| **Contract** | A versioned schema in `packages/shared` — the only legal cross-boundary surface. |
