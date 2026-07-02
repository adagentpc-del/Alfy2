# Enterprise Agent Cabinet

The cabinet is the executive AI layer that runs the holding company under Alyssa DelTorre. It already
exists in code — this doc consolidates the roster that was previously scattered across
`ALFIE_MASTER_CONTROL.md`, `CONSTITUTION_AND_ENTERPRISE.md`, and the `ai-org` engine.

Module: `packages/core/src/ai-org/` (78 seeded role cards, chain of command, delegation packets,
accountability ledger). Contracts: `packages/shared/src/contracts/ai-org.ts`. Migrations:
`0227_ai_org.sql`. Runtime: `ai-org-runtime` + `services/api/src/routes/org.ts`. Smoke: `pnpm aiorg:smoke`,
`pnpm aiorgruntime:smoke`.

## Structure

```
Alyssa DelTorre (CEO — final authority, only human in the chain)
└── Executive layer (4): Executive Governor · Chief of Staff · Portfolio Strategist · Decision Log Manager
    └── Department leaders (11): CRO · Growth Strategist · Product Manager · Chief Systems Architect ·
        COO Agent · Onboarding Agent · CFO Agent · Chief Security & Compliance Officer ·
        Chief Data Architect · Hiring Strategist · Fundraising Strategist
        └── AI employees (63) across 11 departments
            └── Specialist agents (pattern live; standard roster not yet seeded)
```

Chain of command is **enforced in code**: Specialist → AI Employee → Department Leader → Executive →
Alyssa (`validateChainOfCommand()`); skipping levels is rejected. No work without an accepted delegation
packet.

## The cabinet seats

| Seat | Role card | Owns | Watch metric |
|---|---|---|---|
| Governance | Executive Governor | priorities, capital & attention allocation, high-risk approvals triage | department health |
| Coordination | Chief of Staff | priorities → delegation packets, briefings, open loops | open loops closed |
| Portfolio | Portfolio Strategist | rank businesses by leverage; focus/automate/pause recommendations | portfolio ROI |
| Record | Decision Log Manager | decision + rationale capture, decision reviews | rationale completeness |
| Revenue | Chief Revenue Officer | pipeline, pricing approvals, revenue blockers | revenue collected |
| Growth | Growth Strategist | channels, campaigns, publishing approvals | leads generated |
| Product | Product Manager | specs, feedback, activation | funnel conversion |
| Engineering | Chief Systems Architect | builds, integrations, QA | ship reliability |
| Operations | COO Agent | SOPs, tasks, automations, process audits | process throughput |
| Customer | Onboarding Agent | support, retention, referrals | retention |
| Finance | CFO Agent | revenue tracking, costs, subscriptions, invoicing | margin |
| Legal/Sec | Chief Security & Compliance Officer | risk review, privacy, claims, incidents | incidents prevented |
| Data | Chief Data Architect | identity resolution, memory curation, analytics | data trust |
| People | Hiring Strategist | role design, training, performance | scorecard coverage |
| Capital/Impact | Fundraising Strategist | grants, donors, sponsors, impact reporting (incl. Black Flag Innocence Foundation casework) | funds raised |

Full title list: `docs/AGENT_TITLE_REGISTRY.md`. What each seat may do alone vs with approval:
`docs/AGENT_AUTHORITY_MATRIX.md`. How work and reports flow: `docs/AGENT_REPORTING_STRUCTURE.md`.
Cadence: `docs/AGENT_OPERATING_CADENCE.md`. Scoring: `docs/AGENT_KPI_SYSTEM.md`.

## Advisory bodies (distinct from the cabinet)

- **Executive Review Board** — 10 virtual lenses (CEO/CFO/COO/CTO/CMO/CLO/CRO/CSO/CPO/CCO) that stress-test
  big moves (`docs/LEVERAGE_AND_MEDIA.md`, ADR-0092).
- **Confidence-Weighted Agent Council** — 10-role deliberation for contested calls (ADR-0097).
- **Expert Council** — `packages/core/src/expert-council` (migration 0232).

Advisors recommend; the cabinet executes; Alyssa decides.
