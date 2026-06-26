# Alfy² — Product Requirements (Foundation)

**Status:** Foundation phase. This PRD scopes the *platform*, not features.
**Owner:** Founder (Alyssa DelTorre)
**Last updated:** 2026-06-24

---

## 1. Problem

A multi-venture operator loses leverage to fragmentation: context scattered across tools,
follow-ups dropped, decisions undocumented, and no single system that can act, explain itself,
and improve. Existing assistants answer questions; they do not *operate* a portfolio with memory,
accountability, and guardrails.

## 2. Vision

Alfy² is an **adaptive executive operating system** — a kernel that coordinates specialized agents
and domain modules to manage businesses, personal life, health, finance, ideas, and projects.
It behaves like an operating system: modular, explainable, gated, and improving from history.
Architected so it can become the **FounderOS** SaaS platform.

## 3. What the foundation must deliver

The foundation is "done" when the platform can, in principle, accept an intent, plan it across
modules, dispatch it to agents, gate irreversible actions, and record everything explainably —
**without any business feature being implemented.**

### Functional requirements (platform-level)
- **FR1 — Module registry:** modules self-register via manifest; can be added/removed without core edits.
- **FR2 — Agent registry & contract:** agents register and are invoked only through a versioned contract.
- **FR3 — Signal→Action envelope:** every action carries *what changed / why it matters / what next* + rationale.
- **FR4 — Approval gate:** any `irreversible` action halts for human approval.
- **FR5 — Event & Decision logs:** append-only history of actions and the reasoning behind them.
- **FR6 — Memory/profile:** durable operator context, read by the planner, written through an audited contract.
- **FR7 — Config system:** layered, validated configuration with no secrets in code.
- **FR8 — Multi-tenancy:** `tenant_id` + RLS on every row from day one.

### Non-functional requirements
- **NFR1 — Modularity:** no cross-module or core↔agent direct imports; contracts only.
- **NFR2 — Explainability:** no action without a stored rationale.
- **NFR3 — Cost control:** AI off by default, flagged, cached, logged, rate-limited.
- **NFR4 — Safety:** irreversible actions never auto-execute; least-privilege secrets.
- **NFR5 — Portability to SaaS:** zero tenant-coupling outside the platform layer.
- **NFR6 — Operability:** deterministic startup sequence; health/readiness checks.

## 4. Users & roles (foundation)
- **Operator** — the human the OS works for; sole approver of irreversible actions.
- **System** — orchestrator acting under policy.
- *(Future, FounderOS)* — Team members, delegated approvers, tenant admins.

## 5. Success criteria for the foundation
1. A new module can be scaffolded and registered in < 30 minutes following the standards docs.
2. A new agent can be added by implementing one contract, with no orchestrator change.
3. Every request produces a replayable trail in the Event/Decision logs.
4. Removing a module leaves the system green.
5. No secret appears in source; `pnpm run check` passes on a clean clone.

## 6. Explicit non-goals (this phase)
- Any domain feature, connector, or UI.
- Autonomous irreversible action.
- Billing or multi-user signup flows.

## 7. Open questions
Tracked in [`BUILD_PLAN.md`](./BUILD_PLAN.md) §"Open questions". Resolve before building features.
