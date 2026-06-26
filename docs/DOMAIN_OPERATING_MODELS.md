# Domain Operating Models

Instead of automating single tasks, Domain Operating Models redesign **whole functions**. The factory
stands up a complete operating model for each of the eleven domains — goals, workflows, agents, KPIs,
assets, approvals, dashboards, and escalation rules — from a canonical template. Deterministic, pure
(no I/O). Tenant-scoped.

Module: `packages/core/src/domain-model/`. Contracts: `packages/shared/src/contracts/domain-model.ts`
(mirrored in `workers/`). Migrations: `0038_domain_models.sql`, `0039_domain_models_rls.sql`. ADR:
`docs/adr/ADR-0024-domain-operating-models.md`. Smoke: `pnpm domain:smoke`.

## The eleven domains

**Sales · Marketing · Finance · Operations · Legal/Risk · Customer Success · Product · Recruiting ·
Personal Admin · Health · Asset Management.**

## What every domain gets

Each `DomainModel` carries the eight components:

- **goals** — what the domain is trying to achieve
- **workflows** — the repeatable processes that pursue them (name, purpose, trigger, steps)
- **agents** — the Agent Factory keys that run the work
- **KPIs** — the measures (name, target, unit, direction)
- **assets** — the Global Asset Library items the domain relies on
- **approvals** — the human-in-the-loop gates
- **dashboards** — the views that make it legible
- **escalation rules** — condition → action → who it escalates to

For example, Finance ships with goals (healthy runway, on-time close, margin), workflows (monthly close,
cash management), agents (finance.payments, finance.reporting), KPIs (runway months, gross margin, DSO),
approvals ("any payment requires approval"), and escalations ("runway below 6 months → escalate to owner
immediately"). Health's defaults stay deliberately advisory and point to clinician consultation.

## The factory

`create(domain, {name?})` builds one domain's model from the template, **deep-cloned** so it can be
edited freely without mutating the template or other models. `createAll()` builds all eleven at once
(e.g. when standing up a business).

## Composes the platform

A domain references the rest of Alfy²: `agents` are Agent Factory keys, `kpis` feed the Goal Engine,
`assets` live in the Global Asset Library, `approvals` route through the Security Gate, and
`escalation_rules` are the human-in-the-loop boundaries.

## Tenant isolation

Every model is tenant-scoped (one model per domain per tenant), matching the RLS on `domain_models`.

## Wiring (Phase 2)

The factory is pure today. Phase 2 persists models to `domain_models` and wires each domain's KPIs into
live Goals and its workflows into Campaign/automation execution.
