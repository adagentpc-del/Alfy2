# Agent Operating Cadence

When the machine runs. The cadence itself is already specified — the **Enterprise Operating Rhythm**
(ADR-0118) and **Executive Operating Manual** (ADR-0119) in `docs/OPERATING_SYSTEM_META_LAYER.md`, plus the
`review-cadence` module (migration `0231`) and per-role `review_cadence` on every role card. This doc maps
that rhythm onto the agent cabinet and names what runs it.

## Daily

| When | What | Who / mechanism |
|---|---|---|
| Morning | Daily brief assembled (cash, revenue, alerts, top-3 priorities, needs-you queue) | Chief of Staff → `GET /mission-control/brief`; briefing engine (ADR-0070) |
| Morning | Approval queue triaged; parked 202s surfaced | Executive Governor → `/approvals` |
| Continuous | Packets accepted, worked, reported; follow-ups checked (Don't-Drop-the-Ball scan) | all employees; `dont-drop-ball` |
| Evening | Evening brief + reflections into institutional memory | briefing engine |

## Weekly (default review cadence for most role cards)

- Department leaders review employee reports → department report.
- CRO: pipeline review (stalled deals, next money moves). Growth: channel review. CFO: cost/subscription scan.
- Chief of Staff: open-loops sweep; weekly brief to Alyssa.
- Reflection Engine weekly review → lessons, automation candidates, risks (ADR-0053).

## Monthly

- KPI scorecards graded (`department-os`, 94 scorecards) — see `docs/AGENT_KPI_SYSTEM.md`.
- Campaign 70/30 optimization pass (`CAMPAIGN_INTELLIGENCE.md`).
- Persistent-approval grants with monthly review return to the queue.
- Portfolio Strategist: portfolio re-rank (focus/automate/pause).

## Quarterly

- Org-health review (`org-health`, migration `0233`) + role-card audits (missions, scopes, KPIs still right?).
- Agent Evaluation Lab re-scores promoted agents (ADR-0045); demote anything below the bar.
- Reflection Engine quarterly review; capital allocation review (`/capital` routes).

## Execution reality (today vs target)

Today **nothing schedules itself** — `services/orchestrator` is a stub, so cadence events run when a human
triggers the routes. The target is the orchestrator running cadence jobs (first job: the daily brief),
idempotent per (tenant, date) — see `docs/AUTOMATION_ORCHESTRATION_SPEC.md` and
`docs/FIVE_DAY_COMPLETION_PLAN.md` (Day 4). Until then, this cadence is the human checklist.

Cadence invariants: a cadence event that fires produces a record (brief, report, review) — silent cadences
are defects; missed cadences surface as Mission Control alerts; cadence work follows the same packet →
report → review flow as everything else (`docs/AGENT_REPORTING_STRUCTURE.md`).
