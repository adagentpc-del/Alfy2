# Enterprise Playbook Generator

For every business and domain, the Enterprise Playbook Generator produces a full playbook — the
operating IP a person or agent needs to run the function. It composes the Domain Operating Models so the
playbook never drifts from the model. Deterministic. Tenant-scoped.

Module: `packages/core/src/playbook/`. Contracts: `packages/shared/src/contracts/playbook.ts` (mirrored
in `workers/`). Migrations: `0046_playbooks.sql`, `0047_playbooks_rls.sql`. ADR:
`docs/adr/ADR-0028-enterprise-playbook-generator.md`. Smoke: `pnpm playbook:smoke`.

## Ten artifact kinds

`generate(input)` produces all ten: **SOPs · workflows · scripts · checklists · onboarding docs ·
training docs · role scorecards · KPIs · escalation rules · client-facing assets.** SOPs and checklists
are derived from each domain workflow; KPIs and escalation rules come from the operating model; the role
scorecard is built from the domain's goals and KPIs; scripts and client assets are shaped per domain.

`generateAll(businessName)` builds a playbook for every one of the eleven domains at once.

## Composes the Domain Operating Models

The generator reads `DOMAIN_TEMPLATES`, so a playbook and its operating model stay in lockstep — change
the model, regenerate the playbook.

## Tenant isolation

Playbooks are tenant-scoped, matching the RLS on `playbooks`.

## Wiring (Phase 2)

Phase 2 persists playbooks, files each artifact into the Global Asset Library, and supports editing and
versioning individual artifacts.
