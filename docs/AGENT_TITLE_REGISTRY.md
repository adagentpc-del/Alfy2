# Agent Title Registry

The canonical registry of every AI role title in the enterprise. **Source of truth is code**:
`DEFAULT_ROLE_CARDS` in `packages/core/src/ai-org/engine.ts` (78 seeded role cards; idempotent per
tenant + role name via `seedRoleCards()`). This doc is the human-readable mirror — if they disagree, the
code wins and this file must be updated.

Each role card carries: mission, businesses used by, responsibilities, operating loop, allowed actions,
approval requirements, inputs/outputs, tools, KPIs, failure signals, escalation rules, review cadence,
permission scope, and `reports_to`. Authority tiers: `docs/AGENT_AUTHORITY_MATRIX.md`.

## Executive layer (4) — report to Alyssa DelTorre

| Title | Department |
|---|---|
| Executive Governor | executive |
| Chief of Staff | executive |
| Portfolio Strategist | executive |
| Decision Log Manager | executive |

## Department leaders (11) — report to the Executive Governor

| Title | Department |
|---|---|
| Chief Revenue Officer | revenue |
| Growth Strategist | growth |
| Product Manager | product |
| Chief Systems Architect | engineering |
| COO Agent | operations |
| Onboarding Agent | customer_success |
| CFO Agent | finance |
| Chief Security & Compliance Officer | legal |
| Chief Data Architect | data |
| Hiring Strategist | people_ops |
| Fundraising Strategist | fundraising |

## AI employees (63) — report to their department leader

| Department (leader) | Titles |
|---|---|
| revenue (CRO) | Sales Strategist · Outreach Agent · Proposal Agent · Deal Desk Agent · Pricing Analyst · Follow-Up Agent |
| growth (Growth Strategist) | Social Media Manager · Content Strategist · Email Campaign Manager · SEO Manager · PR Manager · Conversion Copywriter · Brand Strategist · Competitor Research Agent |
| product (Product Manager) | UX Auditor · Feature Spec Writer · Release Notes Agent · User Feedback Analyst · Activation Agent |
| engineering (Chief Systems Architect) | Build Agent · GitHub Agent · Supabase Agent · Render Agent · Integration Agent · Debug Agent · QA Tester |
| operations (COO Agent) | SOP Builder · Task Manager · Automation Manager · Process Auditor · Documentation Agent |
| customer_success (Onboarding Agent) | Support Agent · Retention Agent · Referral Agent · Customer Feedback Agent |
| finance (CFO Agent) | Revenue Tracker · Cost Controller · Subscription Auditor · Invoice/Payment Agent |
| legal (Chief Security & Compliance Officer) | Legal Risk Reviewer · Privacy Agent · Claims Checker · Contract Checklist Agent · Incident Response Agent |
| data (Chief Data Architect) | Identity Resolution Agent · Memory Curator · Knowledge Manager · CRM Cleaner · Analytics Analyst · External Intelligence Agent |
| people_ops (Hiring Strategist) | Role Designer · Interview Agent · Training Agent · Performance Manager · Offboarding Agent |
| fundraising (Fundraising Strategist) | Grant Researcher · Grant Writer · Major Donor Agent · Sponsor Agent · Donor Stewardship Agent · Impact Reporting Agent · Volunteer Manager · Case Operations Agent |

## Specialists (tier 4)

The specialist layer (research/copy/email/social/SEO/CRM/GitHub/Supabase/QA task workers under an AI
employee) is a live *pattern* in `ai-org` but the standard roster is **not yet seeded**. New specialists are
added via `addRoleCard()` with `reports_to` set to an AI employee — never directly to a leader or executive.

## Registry rules

1. Titles are unique per tenant; `seedRoleCards()` never duplicates.
2. Every new title requires: mission, KPIs, permission scope, `reports_to` (null only for executives),
   and review cadence — the contract rejects anything less.
3. `department-os` (15 departments, 94 scorecards — migration `0226`) carries per-role scorecards; a title
   without a scorecard is a defect (see `docs/AGENT_KPI_SYSTEM.md`).
4. Retiring a title requires reassigning its open delegation packets first.
