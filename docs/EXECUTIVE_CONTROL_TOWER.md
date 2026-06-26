# Executive Control Tower

The Executive Control Tower is the operator dashboard — the one place that pulls the whole platform
together and answers "what's the state of everything, and what needs me now?" It assembles a single
snapshot from the other engines' signals. Deterministic, read-only (a snapshot changes nothing).
Tenant-scoped.

Module: `packages/core/src/control-tower/`. Contracts:
`packages/shared/src/contracts/control-tower.ts` (mirrored in `workers/`). Migrations:
`0044_control_tower_snapshots.sql`, `0045_control_tower_snapshots_rls.sql`. ADR:
`docs/adr/ADR-0027-executive-control-tower.md`. Smoke: `pnpm tower:smoke`.

## What the dashboard shows

`assemble(input)` produces one `ControlTowerSnapshot` with every section:

- **cash position** (with computed runway) and **revenue pipeline**
- **goals**, **active campaigns**, **blocked deals**, **risks**
- **agent performance** and **approvals needed**
- **top 3 priorities** (computed)
- **business health** by company
- **opportunities** surfaced (ranked)
- **workflows running**
- **monthly/quarterly review queue**

## Two computed views

- **Runway** = cash on hand ÷ (burn − inflow), or null when cash-flow positive.
- **Top three priorities** — a weighted ranking across a short runway, high-severity risks, the biggest
  blocked deals, the highest-priority active goals, and owner-level approvals, collapsed to the three
  things that most need attention now. (In the smoke: "Mitigate risk: late payment", "Approve: wire
  $40k", "Unblock Acme Corp".)

Opportunities are sorted by composite score so the strongest come first.

## A pure read-model

The Control Tower composes the other engines' outputs by reference and mutates nothing, so it's safe to
regenerate as often as wanted. Snapshots are stored immutably (INSERT + SELECT only), so the dashboard's
history is auditable.

## Tenant isolation

Snapshots are tenant-scoped, matching the RLS on `control_tower_snapshots`.

## Wiring (Phase 2)

Today `assemble` takes a typed input bundle. Phase 2 wires those inputs to live engine outputs — the
Goal Engine, Campaign Intelligence, Opportunity Intelligence, Agent Observability, the Security Gate's
approval queue, and cash/pipeline data — and regenerates the snapshot on a schedule.
