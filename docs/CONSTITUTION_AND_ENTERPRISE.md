# Constitution, Enterprise Structure & Institutional Memory — the top layer

Alfy² now has a top layer: the constitutional, structural, and institutional-memory engines that sit above the
rest of the platform. At its head is the **Constitution** — ten frozen principles that are the highest
authority, the rule every other engine and every agent answers to. Beneath it the **Enterprise Hierarchy** gives
the portfolio an eight-level org tree with inheritance; the **Reflection Engine** turns activity into periodic
lessons; the **Enterprise Knowledge Graph** connects everything the platform knows; the **Operating Manual
Generator** turns stable workflows into reusable IP; the **Digital Twin** keeps a live model to plan against; the
**Institutional Memory** ledger never forgets a decision; **Executive Mission Control** composites it all onto
one screen; the **Continuous Improvement Engine** keeps every workflow honest; and **Builder Mode** stands up a
whole venture on command. All deterministic, tenant-scoped.

| Engine | Module | Contracts | Migrations | ADR | Smoke |
| --- | --- | --- | --- | --- | --- |
| Constitution | `core/src/constitution/constitution.ts` | `constitution.ts` | none (static) | ADR-0051 | `pnpm constitution:smoke` |
| Enterprise Hierarchy | `core/src/hierarchy/registry.ts` | `hierarchy.ts` | 0089/0090 | ADR-0052 | `pnpm hierarchy:smoke` |
| Reflection Engine | `core/src/reflection/engine.ts` | `reflection.ts` | 0091/0092 | ADR-0053 | `pnpm reflection:smoke` |
| Enterprise Knowledge Graph | `core/src/knowledge-graph/graph.ts` | `knowledge-graph.ts` | 0093/0094 | ADR-0054 | `pnpm graph:smoke` |
| Operating Manual Generator | `core/src/operating-manual/generator.ts` | `operating-manual.ts` | 0095/0096 | ADR-0055 | `pnpm manual:smoke` |
| Digital Twin | `core/src/digital-twin/twin.ts` | `digital-twin.ts` | 0097/0098 | ADR-0056 | `pnpm twin:smoke` |
| Institutional Memory | `core/src/institutional-memory/ledger.ts` | `institutional-memory.ts` | 0099/0100 | ADR-0057 | `pnpm institutional:smoke` |
| Executive Mission Control | `core/src/mission-control/engine.ts` | `mission-control.ts` | none (read model) | ADR-0058 | `pnpm mission:smoke` |
| Continuous Improvement Engine | `core/src/continuous-improvement/engine.ts` | `continuous-improvement.ts` | 0101/0102 | ADR-0059 | `pnpm improve:smoke` |
| Builder Mode | `core/src/builder-mode/builder.ts` | `builder-mode.ts` | 0103/0104 | ADR-0060 | `pnpm builder:smoke` |

## Constitution — the highest authority

The Constitution is the rule above the rules. `PRINCIPLES` is the frozen catalog of ten — **1 Human remains in
command, 2 Think aggressively, 3 Act conservatively, 4 Execute with urgency, 5 Finish what was started, 6
Protect trust, 7 Optimize for measurable outcomes, 8 Reuse before rebuilding, 9 Explain important decisions, 10
Continuously improve.** `check(action)` returns a verdict per principle. Two are **hard gates**: under Principle
3, an irreversible/financial/legal/production action **without approval** must go for approval and is a violation
until approved; under Principle 5, abandoning approved work **without a documented reason** is a violation.
Principles 7 and 9 flag a missing measurable outcome and a missing explanation. Every agent references the
Constitution during execution; it composes the AI Center of Excellence (ADR-0022), the Security Gate (ADR-0015),
and the Plane registry (ADR-0046), sitting above them as the authority they enforce. The catalog is frozen, so
this engine has **no migration**.

## Enterprise Hierarchy — the org tree

The portfolio is an eight-level tree: **Enterprise → Company → Department → Team → Project → Asset → Task →
Agent.** Every node inherits policies, security, branding, permissions, and reusable assets from its ancestors.
`resolve()` merges top-down — **lists union, scalars override** — so a company-specific override is local and
never erases what it inherits. `atLevel` returns every node at a level for portfolio reporting, and resources
marked `sharedAcrossCompanies` (vendors, SOPs, compliance) support cross-company opportunities and reuse. A
child's level must sit strictly below its parent's, so the tree can never invert.

## Reflection Engine — periodic lessons

A standing review at four cadences — **weekly, monthly, quarterly, yearly** — evaluating revenue, missed
opportunities, follow-up failures, automation and agent performance, workflow bottlenecks, time, energy,
decision quality, and goal progress. It generates lessons, improvements, workflows to automate or retire, new
agents, risks, and next-period priorities. Reviews accumulate in `history`, making reflection the institutional
memory of how the platform has performed over time. It composes the Pattern Engine and Workflow ROI Tracking.

## Enterprise Knowledge Graph — everything connected

**Fifteen node kinds** — people, businesses, projects, tasks, documents, assets, meetings, github repos,
automations, goals, workflows, agents, vendors, investors, competitors — connected by typed, weighted
relationships. `search` finds nodes by kind/term, `neighborhood` returns one-hop surroundings, and
`recommendations` applies triadic closure, surfacing pairs that share two or more neighbours but are not yet
directly linked. Together they answer the cross-cutting query — "every project involving Alberto, Divini
Procure, investors, and procurement" — that flat lists cannot.

## Operating Manual Generator — stable workflows become IP

When a workflow becomes stable, the generator produces its **eight artifacts** — SOP, checklist, playbook,
onboarding guide, training document, troubleshooting guide, KPIs, ownership matrix — each saved to the Asset
Library **by reference** via the `assetSink` and marked reusable IP. Generation is **gated on `is_stable`**, so
manuals describe workflows that have earned the documentation. It is **workflow-triggered**, distinct from the
**domain-triggered** Enterprise Playbook Generator (ADR-0028).

## Digital Twin — a live model to plan against

A continuously-updated model of the enterprise — businesses, finances, assets, contacts, projects, agents,
workflows, campaigns, goals, risks — carrying a computed **runway**. `simulate()` runs **four what-if
scenarios** (hire, pause_business, revenue_drop, launch_offer), each projecting resulting state and runway, the
deltas from today, and a recommendation. It is the basis for forecasting and planning, complementing the Control
Tower (read snapshot) and the Business Simulation Engine (A-vs-B). Snapshots are append-only.

## Institutional Memory — never forget a decision

An append-only ledger of the enterprise's consequential history across **nine record kinds**: decision
rationale, rejected idea, failed experiment, successful experiment, negotiation outcome, lesson learned, vendor
experience, client preference, implementation history. Records are **never edited or deleted** — a correction is
a new record. A `decision_rationale` **must** record both `what_we_knew` and `why_chosen`, answering "what did
we know at the time, and why did we choose this?"; `rationaleFor` returns it. It complements the Memory Engine
(live working context) and the Reflection Engine (periodic lessons).

## Executive Mission Control — one screen

The one-screen executive dashboard: enterprise and company health (scored, with labels), revenue, pipeline,
cash, runway, goals, blocked items, risks, approvals, top opportunities, agent/automation/system health, AI
costs, ROI, and daily priorities — plus a single computed **headline** by the fixed order **urgent runway →
approvals → risks → blocked → today's first priority.** It is a **read model** composing the Control Tower
(ADR-0027), Cost CFO (ADR-0047), and Agent Observability (ADR-0020), so it adds **no migration**. The Control
Tower is the operator snapshot; Mission Control is the executive composite that adds system/automation health, AI
cost, and the headline.

## Continuous Improvement Engine — keep every workflow honest

Every workflow is scored on six dimensions — speed, quality, cost efficiency, conversion, reliability, user ease
— with **health** as their mean, and gets one recommended move: **simplify, automate, remove, merge, split,
delegate.** Each recommendation carries an expected impact and a confidence, sorted by **impact × confidence**;
`worstFirst` prioritizes the lowest-health workflows where improvement matters most. Re-evaluation upserts. It
complements Workflow ROI Tracking and the Reflection Engine, turning their signals into a specific change per
workflow.

## Builder Mode — stand up a venture on command

Trigger phrase `BUILDER_TRIGGER = "I want to build"`. `build()` produces the complete **eighteen-stage** venture
operating system — discovery, market validation, offer design, pricing, business model, brand, product
architecture, technical architecture, database, agent plan, asset checklist, legal, marketing plan, sales plan,
automation plan, launch plan, KPIs, review checkpoints — each stage with a title, summary, items, and open
questions. It is **human-in-command**: `build()` always returns `awaiting_approval` and nothing is built until
`approve()`. It composes the Idea Builder (ADR-0008) and Business Template (ADR-0006).

## How they connect

The **Constitution** is the head of the layer — ten frozen principles that every other engine and every agent
answers to, with Principle 3 (act conservatively) and Principle 5 (finish what was started) as hard gates the
platform cannot quietly cross. The other nine engines serve it. The **Enterprise Hierarchy** gives the portfolio
its shape, so policies, security, and assets flow down one tree instead of being re-declared. The **Reflection
Engine** and the **Institutional Memory** ledger are the platform's memory over time — one reviews periods and
emits lessons, the other records every consequential decision append-only and answers "what did we know, and why
did we choose this?" The **Enterprise Knowledge Graph** connects everything the platform tracks so cross-cutting
questions become queries. The **Operating Manual Generator** turns stable workflows into reusable IP, and the
**Continuous Improvement Engine** keeps every workflow honest — both serving Principle 10. The **Digital Twin**
holds a live model to plan against, and **Executive Mission Control** composites the whole picture onto one
screen with a single headline — the executive's view of a platform that, under its Constitution, remembers its
past, knows its structure, improves itself, and keeps the human in command.
