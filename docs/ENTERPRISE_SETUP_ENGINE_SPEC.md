# Enterprise Setup Engine — Spec

The engine that stands up a new company (or onboards an existing one) into the Portfolio Company OS in one
governed run. All the parts exist — this spec defines the single `setup()` sequence through them; the only
net-new piece is the thin runner that executes the checklist and records progress.

**Existing machinery:** `business` factory + Business Template (13 departments, ADR-0006/0073) ·
`business-profile` (migration `0230`) · Domain Operating Models `createAll()` (ADR-0024) · Enterprise
Playbook Generator (ADR-0028) · Business Asset Checklist (25 key assets, ADR-0038) · `entity-structure`
(ADR-0063, analysis-only) · `infra-launch` (env-key map: what the venture needs, e.g. Stripe keys —
needs-secret flags only) · connector blueprints · `ein` module · tenancy isolation.

## The setup run (idempotent checklist; each step logs a status)

| # | Step | Produces | Gate |
|---|---|---|---|
| 1 | Register | business record + profile + context stack (key per `docs/PORTFOLIO_COMPANY_OS.md` roster) | none |
| 2 | Structure | entity-structure analysis (LLC/S-Corp/…) + CPA/attorney question list | **analysis only — professional review always required** |
| 3 | Departments | 13 departments instantiated; cabinet scoped in via `businesses_used_by` | none |
| 4 | Domain models | 11 domain operating models (`createAll()`): goals, workflows, KPIs, escalation | none |
| 5 | Playbooks | generated playbook set (SOPs, scorecards, onboarding docs) → Asset Library | none |
| 6 | Brand | Brand DNA profile (voice, positioning) — new or linked existing | none |
| 7 | Connectors | needed integrations declared as descriptors (mock adapters; `infra-launch` lists which secrets the human must place in env) | live creds: **human only, never repo** |
| 8 | Asset baseline | 25-asset checklist initialized → gap list becomes delegation packets | none |
| 9 | Revenue slice | business appears in Revenue Command (fastest-path computed once data exists) | none |
| 10 | Dashboard | Mission Control tile + portfolio rank entry | none |
| 11 | Review | setup report → Alyssa | **Alyssa accepts the company as operational** |

Re-running `setup()` on an existing business fills gaps only (idempotent per step) — that is also the
onboarding path for the roster companies not yet in code (Divini Group, DatingModern.ai, Black Flag
Innocence Foundation, AI Builder Pro).

## Rules

1. Setup **never** files anything, opens accounts, moves money, or signs — steps 2 and 7 produce
   analyses and checklists for humans (Finance Command Center's `forbiddenActions()` applies).
2. No secrets pass through the engine; it declares *which* env keys are needed and verifies presence,
   never values.
3. A company is not "in the portfolio" until step 11 is accepted — half-setup companies show as
   `setting_up` on the dashboard, never as operational.
4. Every step's output is an Asset Library artifact; a failed step parks with a status and a reason,
   never silently.

## Build order

Thin runner engine (`packages/core/src/setup-engine/`, contract + smoke, mock connectors) → persistence +
`/setup` routes → dashboard "company setup" progress view → onboard the four missing roster companies as
the first real runs.
