# ADR-0028: Enterprise Playbook Generator

**Status:** Accepted
**Date:** 2026-06-25

## Context

A Domain Operating Model (ADR-0024) defines a function's goals, workflows, agents, KPIs, and escalation
rules — but it isn't yet the *operating documentation* a team uses day to day. Alyssa needs every
business and domain to ship as reusable IP: the SOPs, scripts, checklists, onboarding and training docs,
role scorecards, and client-facing assets that turn a model into something a person (or agent) can run.

## Decision

Add a `playbook/` generator in `@alfy2/core` that, for a business and domain, produces a full playbook.
It composes the `DOMAIN_TEMPLATES` from the Domain Operating Models so the playbook and the operating
model never drift. Deterministic. Tenant-scoped.

### Ten artifact kinds

`generate(input)` produces all ten kinds the request lists: **SOPs, workflows, scripts, checklists,
onboarding docs, training docs, role scorecards, KPIs, escalation rules, and client-facing assets.**
SOPs and checklists are derived from each domain workflow; KPIs and escalation rules come straight from
the operating model; scripts and client assets are shaped per domain; the role scorecard is built from
the domain's goals and KPIs. `generateAll()` builds a playbook for every domain.

### Contracts & data

`packages/shared/src/contracts/playbook.ts`: `PlaybookArtifactKind`, `PlaybookArtifact`, `Playbook`,
`GeneratePlaybookInput`. Migration 0046 adds `playbooks` + 0047 deny-by-default RLS.

## Consequences

- A domain ships as operating IP, not tribal knowledge — onboard a hire or an agent with a complete,
  consistent playbook in one call.
- Because it composes the Domain Operating Models, the playbook stays in lockstep with the model; change
  the model and regenerate.
- Phase 2 persists playbooks to the `playbooks` table, files each artifact into the Global Asset Library,
  and lets the operator edit/version individual artifacts.
