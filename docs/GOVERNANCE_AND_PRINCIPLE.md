# Governance, Economics & Doctrine — the spine the platform runs on

Alfy² is now large enough that it needs a spine: a clear split between the engines that **govern** and the
engines that **act**, the economics that keep both honest, and the single doctrine the whole thing serves.
This layer is that spine — the **Control/Execution Plane** registry draws the line and guards it, the
**Agent Evaluation Lab** makes an agent earn trust before it crosses, the **Cost & Token CFO** keeps the
spend legible, the **Business Simulation Engine** picks the better of two options, the **FounderOS
Commercialization Layer** prepares the product map, and the **Founder Operating Principle** is the doctrine
everything else lines up behind. All deterministic, tenant-scoped.

| Engine | Module | Contracts | Migrations | ADR | Smoke |
| --- | --- | --- | --- | --- | --- |
| Agent Evaluation Lab | `core/src/agent-eval/lab.ts` | `agent-eval.ts` | 0079/0080 | ADR-0045 | `pnpm agenteval:smoke` |
| Control/Execution Planes | `core/src/planes/registry.ts` | `planes.ts` | none (static) | ADR-0046 | `pnpm planes:smoke` |
| Cost & Token CFO | `core/src/cost-cfo/cfo.ts` | `cost-cfo.ts` | 0081/0082 | ADR-0047 | `pnpm cfo:smoke` |
| Business Simulation Engine | `core/src/business-simulation/engine.ts` | `business-simulation.ts` | 0083/0084 | ADR-0048 | `pnpm bizsim:smoke` |
| FounderOS Commercialization | `core/src/commercialization/registry.ts` | `commercialization.ts` | 0085/0086 | ADR-0049 | `pnpm commercial:smoke` |
| Founder Operating Principle | `core/src/founder-principle/principle.ts` | `founder-principle.ts` | 0087/0088 | ADR-0050 | `pnpm principle:smoke` |

## Control/Execution Planes — the spine

Alfy² splits into two planes. The **Control Plane** owns ten concerns (policy, identity, permissions,
approvals, routing, evaluations, observability, audit logs, cost controls, risk controls); the **Execution
Plane** owns eight (agents, workflows, automations, connectors, tools, campaigns, repo actions, content
generation). `PLANE_CATALOG` tags every engine to a plane and concern, and `guard(ExecutionRequest)` allows
an execution action **only if** identity is verified, policy is checked, and it is permitted — and, when
approval is required, only if approved — otherwise it is a `bypass_attempt` and is denied. The existing
control engines (Security Gate, Agent Identity, Persistent Approval, Model Router, Agent Eval Lab,
Observability, Audit Log, Cost CFO, Source-of-Truth) are the Control Plane; the execution engines (Agent
Factory, Domain Models, Follow-Up Autopilot, Connectors, GitHub Intelligence, Campaigns, War Room, Sales
Asset Generator, Knowledge Vault) are the Execution Plane. The catalog is static architecture metadata, so
this engine has **no migration**.

## Agent Evaluation Lab — earn trust before crossing

Before any agent is trusted it is tested: test tasks with expected outputs, failure cases, and risk checks,
scored on **accuracy, usefulness, cost, speed, reliability** (each `0..1`; cost and speed are the inverse of
measured cost and runtime). Agents climb a six-stage ladder `draft → testing → limited_use → approved →
production → retired`. An agent **passes** when accuracy, reliability, and usefulness all clear the threshold
(default `0.8`) and no risk is flagged on a non-failure case. `promote()` into the gated stages (`approved`,
`production`) **throws** unless the agent passed — no agent gets `broad_permissions_allowed` until it has
earned it. A Control Plane capability that composes Agent Identity & Zero Trust (ADR-0025) and the AI Center
of Excellence (ADR-0022).

## Cost & Token CFO — keep the spend legible

Tracks six cost categories (model, api, automation, tool_subscription, compute, storage) against value
(revenue plus human time saved × rate). Per workflow it computes total cost, total value, cost per
task/lead/booked-call/sale (`null` when the denominator is zero), ROI `(value − cost) / cost`, the break-even
point (total cost), and the largest cost category. It recommends a concrete move: cheaper_model/local_model
(model spend ≥ 50%), batch_processing (≥ 100 tasks), pause_expensive_agent (ROI < 0),
upgrade_when_roi_supports (ROI ≥ 2), or better_workflow (thin margin). It complements Workflow ROI Tracking
(ADR-0023) with cost decomposition, per-unit costs, break-even, and specific model/infra moves — a Control
Plane cost-control capability.

## Business Simulation Engine — pick the better option

An A-vs-B comparator over six decision kinds (focus_choice, campaign_choice, hire_vs_automate, pricing_choice,
lead_focus, build_vs_sell). Each option carries projected_revenue, probability, time_cost_days, stress_cost,
and risk; it is projected to best/likely/worst with an expected value of `revenue × probability` and scored on
a composite that weighs that EV against risk, stress, and time. The engine recommends the higher-scoring
option with a reason. It **informs** decisions — it does not execute them. Distinct from the scenario
Simulation Engine (ADR-0021), which models a single scenario's three cases; this one recommends a winner
between two options and adds stress_cost and time_cost.

## FounderOS Commercialization — prepare the product map

Alfy² is Tenant 001, designed to later become FounderOS. Every internal feature is classified by tier —
personal_only, business_reusable, founder_saas_feature, agency_service, enterprise_product — and flagged for
whether it is a SaaS-module candidate. The registry seeds ten named features (Executive Inbox, Revenue
Factory, Conversion War Room, Agent Factory, Follow-Up Autopilot, Asset Library, Goal Engine, Pattern Engine,
Control Tower, Knowledge-to-Money Engine). This is **preparation only**: `commercialized` is always false and
nothing is activated. It prepares the architecture for a future monetization decision.

## Founder Operating Principle — the doctrine

The global principle: convert speed of thought into speed of execution, and never let an idea die in notes.
`route()` resolves every idea to exactly one of eight dispositions (task, asset, campaign, offer, agent,
workflow, parked_idea, killed_idea) — it always returns one, so nothing sits in notes. `nextActions()`
guarantees every business always has its five next actions (money, risk, follow-up, asset, conversion),
filling blanks with sensible defaults. `OPTIMIZATION_ORDER` is the system-wide priority that arbitrates every
conflict: **cash > conversion > follow_up > risk_control > execution_speed > founder_energy > reusable_ip.**
This is the operating doctrine the whole platform serves.

## How they connect

The two-plane registry is the spine: it draws the Control/Execution line and `guard()` enforces it, so no
agent acts without identity, policy, permission, and (when required) approval. Sitting on the Control Plane,
the **Agent Evaluation Lab** decides which agents are trusted enough to cross into broad permissions, and the
**Cost & Token CFO** keeps the economics of what crosses legible. The **Business Simulation Engine** informs
the decisions that set direction; the **FounderOS Commercialization Layer** quietly prepares the product map
without activating anything. Above all of them sits the **Founder Operating Principle** — the doctrine that
every idea resolves to a disposition, every business always has its five next moves, and the whole system
optimizes in one order, cash first. Phase 2 wires `guard()` ahead of real execution, the lab into the Agent
Factory, the CFO onto metered usage, and the principle into the Executive Inbox and Control Tower.
