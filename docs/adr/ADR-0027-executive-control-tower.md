# ADR-0027: Executive Control Tower

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² now runs many engines — goals, campaigns, opportunities, agent observability, security approvals,
cash, pipeline. An operator running a serious portfolio needs one place that pulls it all together: the
"$100M operator dashboard" that answers "what's the state of everything, and what needs me now?" without
opening fifteen views.

## Decision

Add a `control-tower/` engine in `@alfy2/core` that assembles a single dashboard **snapshot** from the
platform's signals. Deterministic. Tenant-scoped. A snapshot is a read-only point-in-time view — it
changes nothing.

### One snapshot, every section

`assemble(input)` produces a `ControlTowerSnapshot` with all the required sections: **cash position
(with computed runway), revenue pipeline, goals, active campaigns, blocked deals, risks, agent
performance, approvals needed, the top three priorities, business health by company, opportunities
surfaced, workflows running, and the monthly/quarterly review queue.**

### Computed views

Two things the tower derives rather than takes as input:

- **runway** — cash on hand ÷ (burn − inflow), or null when cash-flow positive.
- **top three priorities** — a weighted ranking across a short runway, high-severity risks, the biggest
  blocked deals, the highest-priority active goals, and owner-level approvals, collapsed to the three
  items that most need attention now.

Opportunities are sorted by composite score so the strongest are first.

### Contracts & data

`packages/shared/src/contracts/control-tower.ts`: `ControlTowerSnapshot`, `ControlTowerInput`, and the
`Tower*` section types (Tower-prefixed to avoid collisions with the Goal Engine's `RiskItem` etc.).
Migration 0044 adds the immutable `control_tower_snapshots` table (INSERT + SELECT only) + 0045 RLS.

## Consequences

- The operator gets a single, coherent read of the whole portfolio, with the three things that matter
  most surfaced automatically.
- It is a pure read-model: it composes the other engines' outputs by reference and never mutates
  anything, so it's safe to regenerate as often as wanted.
- Snapshots are immutable point-in-time records, so the dashboard's history is auditable.
- Phase 2 wires the assemble inputs to live engine outputs (Goal Engine, Campaign Intelligence,
  Opportunity Intelligence, Agent Observability, the Security Gate's approval queue, cash/pipeline data)
  and regenerates the snapshot on a schedule.
