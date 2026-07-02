# Agent Reporting Structure

How work flows down and accountability flows up. The structure is **already enforced in code** — this doc
is the operating description of `packages/core/src/ai-org/` + `ai-org-runtime` (Pg-backed) and the `/org`
routes in `services/api/src/routes/org.ts`. Migration: `0227_ai_org.sql` (delegation packets, agent
reports, escalations, accountability, department reports). Smokes: `pnpm aiorg:smoke`,
`pnpm aiorgruntime:smoke`.

## The chain

```
Alyssa DelTorre
  ↑ escalation / ↓ priorities
Executive layer (Governor · Chief of Staff · Portfolio Strategist · Decision Log Manager)
  ↑ department reports / ↓ delegation packets
Department leaders (11)
  ↑ agent reports / ↓ delegation packets
AI employees (63)
  ↑ task reports / ↓ task packets
Specialists (pattern; roster not yet seeded)
```

`validateChainOfCommand()` rejects any delegation that skips a level. Cross-department requests route
through the Chief of Staff.

## Delegation packets — no work without one

Every unit of work is a packet: objective, context, deliverables, constraints (incl. what requires
approval), deadline, and reporting expectations. Lifecycle: **created → accepted → in progress → reported →
reviewed** (or **escalated**). The runtime rule is literal: an agent that has not *accepted* a packet has no
work. HTTP surface: `POST /org/packets`, `POST /org/packets/:id/accept`, `GET /org/packets`,
`POST /org/reports`, `POST /org/reports/:id/review`.

## Report-back

Every packet ends in a report: what was done, what was produced (asset refs), what's blocked, what needs
approval, what was learned. Reports are reviewed one level up (`/org/reports/:id/review`); leaders roll
employee reports into **department reports**; the Chief of Staff rolls those into the executive briefing
(Mission Control daily/weekly brief — `GET /mission-control/brief`).

## Escalation

Agents escalate when: blocked past SLA, approval needed beyond their scope, conflicting instructions,
failure signals firing (per role card), or risk detected. Escalations go **one level up only**; each level
resolves or re-escalates. Everything lands in `ai_org_escalations` + the accountability ledger, and
critical ones surface as Mission Control alerts (ack/escalate routes exist and are live).

## Statuses and logging (invariant)

Every packet, report, escalation, and approval carries a status and is persisted tenant-scoped under RLS.
The accountability ledger (`ai_org_accountability`) records who was asked to do what, by whom, and what
happened — append-only. Agent observability (`docs/AGENT_OBSERVABILITY.md`) records every action with full
provenance; `explain()` can answer "why did this happen" for any action.

## Human interface

Alyssa's view of this structure is the Executive Dashboard (`docs/EXECUTIVE_DASHBOARD_SPEC.md`): Needs-you
queue (approvals + escalations), department health, and the daily brief. She never receives raw packet
traffic — only triaged decisions, per `docs/CHIEF_OF_STAFF.md` (the executive layer assembles, never
executes).
