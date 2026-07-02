# Agent KPI System

How agent performance is defined, measured, and acted on. The primitives all exist; this doc ties them into
one system:

| Layer | Mechanism | Where |
|---|---|---|
| Per-role KPIs | every role card carries 3–5 KPIs (e.g. Outreach Agent: outreach drafted, reply rate, meetings booked, personalization quality) | `ai-org` `DEFAULT_ROLE_CARDS` |
| Scorecards | 94 employee scorecards across 15 departments | `department-os` (migration `0226`) |
| Action telemetry | every action recorded append-only with provenance, cost, outcome | `agent-observability` (ADR-0020, migration `0030`) |
| Workflow ROI | value vs cost per automation → scale/pause/improve/delete | `workflow-roi` (ADR-0023) |
| Promotion gate | 6-stage ladder; production requires accuracy/reliability/usefulness > 0.8 + no risk failures | `agent-eval` (ADR-0045, migration `0079`) |
| Org rollup | org-health reviews; department health on Mission Control | `org-health` (migration `0233`) |

## The scoring loop

1. **Do** — actions land in the observability ledger with cost and outcome.
2. **Grade (monthly)** — scorecards grade role-card KPIs from telemetry + reviewed reports. A KPI that
   cannot be computed from recorded data is a defect of the KPI, not of the agent — rewrite it.
3. **Value (monthly)** — workflow-ROI prices the agent's workflows: time saved, revenue influenced, cost,
   errors reduced. Cost & Token CFO (ADR-0047) supplies the denominator.
4. **Act (quarterly)** — per agent: **scale** (more scope via `grant()`), **keep**, **improve** (retrain
   loop with Training Agent), **narrow** (reduce scope), or **retire** (reassign packets first). Promotions
   go through the Agent Evaluation Lab — never directly to production.

## Department KPI spines (leader-level)

| Department | Spine KPIs |
|---|---|
| revenue | revenue collected · close rate · pipeline velocity · avg deal size |
| growth | leads · cost per lead · channel ROI · funnel conversion |
| product | activation · feedback cycle time · spec accuracy |
| engineering | ship reliability · build turnaround · defect escape rate |
| operations | process throughput · SOP coverage · automation rate |
| customer_success | retention · response time · referral rate |
| finance | margin · cost variance · invoice cycle time |
| legal | incidents prevented · review turnaround · claim accuracy |
| data | data trust score · identity match rate · report freshness |
| people_ops | scorecard coverage · training completion · role fill time |
| fundraising | funds raised · grant win rate · donor retention · impact reports delivered |

## Rules

1. Every title in `docs/AGENT_TITLE_REGISTRY.md` has a scorecard — no unmeasured agents.
2. KPIs measure *outcomes Alyssa would pay for*, never activity volume alone (NORTHSTAR: value, not motion).
3. An agent's cost (tokens + tools + human review time) is always shown next to its value — ROI-negative
   agents get 30 days to improve before narrowing/retirement.
4. KPI misses fire the role card's failure signals → escalation, not silent decay.
5. Founder-facing KPI of the whole system: **founder time returned** (Freedom Index / Life ROI).
