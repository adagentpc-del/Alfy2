# ADR-0024: Domain Operating Models

**Status:** Accepted
**Date:** 2026-06-25

## Context

Automating single tasks produces a pile of disconnected helpers. The bigger leverage is to redesign a
**whole function** at once — to give Sales, Finance, Health, and the rest a coherent operating model
rather than a scattering of point automations. Alfy² already templates *businesses* (12 departments);
this addresses *functional domains*, each as a complete operating system.

## Decision

Add a `domain-model/` factory in `@alfy2/core`. It stands up a full operating model for one of the
**eleven domains** — sales, marketing, finance, operations, legal/risk, customer success, product,
recruiting, personal admin, health, asset management — from a canonical template. Pure (no I/O).
Tenant-scoped by id.

### What every domain gets

Each `DomainModel` carries the eight required components: **goals, workflows, agents, KPIs, assets,
approvals, dashboards, and escalation rules.** The canonical `DOMAIN_TEMPLATES` define sensible defaults
per domain — e.g. Finance's goals (healthy runway, on-time close, margin), workflows (monthly close,
cash management), agents (finance.payments, finance.reporting), KPIs (runway months, gross margin, DSO),
approvals ("any payment requires approval"), and escalations ("runway below 6 months → escalate to
owner immediately").

### Factory

`create(domain, {name?})` deep-clones the template so each model is independently editable without
mutating the template or other models. `createAll()` builds all eleven at once (e.g. when standing up
a business). Health's defaults deliberately stay advisory and point to clinician consultation.

### Contracts & data

`packages/shared/src/contracts/domain-model.ts`: `DomainKind`, `DomainKpi`, `DomainWorkflow`,
`DomainEscalationRule`, `DomainModel`, `CreateDomainInput`. Mirrored in Pydantic. Migration 0038 adds
`domain_models` (one model per domain per tenant) + 0039 deny-by-default RLS.

## Consequences

- The unit of design moves from "task" to "domain" — each function comes with its goals, the workflows
  that pursue them, the agents that run them, the KPIs that measure them, and the approvals/escalations
  that keep them safe.
- It composes the rest of the platform by reference: a domain's `agents` are Agent Factory keys, its
  `kpis` feed the Goal Engine, its `assets` live in the Global Asset Library, its `approvals` route
  through the Security Gate, and its `escalation_rules` are the human-in-the-loop boundaries.
- The templates are opinionated defaults, not law — they deep-clone so a tenant tailors each domain
  freely. Wiring a domain's KPIs into live Goals and its workflows into Campaign/automation execution
  is Phase 2.
