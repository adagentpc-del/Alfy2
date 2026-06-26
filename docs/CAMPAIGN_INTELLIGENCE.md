# Campaign Intelligence

Campaign Intelligence runs marketing campaigns that test, report, and improve themselves. Every
campaign ships an A/B variant pair with success metrics, produces automatic reports with improvement
recommendations, optimizes monthly, and — once approved — runs on autopilot until a stop condition
fires. It composes the Goal Engine (the campaign's target) and Persistent Approval (the standing
approval that keeps it running). Deterministic (no AI).

Module: `packages/core/src/campaign/`. Contracts: `packages/shared/src/contracts/campaign.ts` (mirrored
in `workers/`). Migrations: `0024_campaigns.sql`, `0025_campaigns_rls.sql`. ADR:
`docs/adr/ADR-0018-campaign-intelligence.md`. Smoke: `pnpm campaign:smoke`.

## Six campaign types

**email, social, landing page, funnel, outreach, lead nurturing.** Each type has a default A/B
starting pair and a default primary metric (e.g. outreach → reply rate, landing page → conversion
rate), used when the caller doesn't supply their own.

## Always A/B

`create` produces **Variant A** and **Variant B** — from caller drafts or the type template — each with
a name, a hypothesis, content, and a traffic weight (50/50 to start). It also attaches the **success
metrics** and the **stop conditions**, and starts the campaign as a draft.

## Automatic reporting

`report(metrics)` turns raw per-variant observations (impressions, conversions, cost, revenue) into
conversion rates, then:

- picks the **winner** by conversion rate (with a minimum-conversions guard so noise doesn't crown a
  winner prematurely),
- computes the **lift** (relative improvement of the winner over the other variant),
- writes a plain-language **summary**, and
- generates **improvement recommendations**: shift traffic to the winner, iterate or retire the losing
  hypothesis, plus a type-specific lever (subject line for email, opening line for outreach, etc.).

The latest report is stored on the campaign.

## Autopilot — continues until a stop fires

After `approve`, the campaign is **active** (autopilot). `assess(signals)` keeps it running unless a
stop condition fires, in priority order:

| Condition | Result | stop_reason |
| --- | --- | --- |
| Goal reached | completed | `goal_reached` |
| Approval expired | stopped | `approval_expired` |
| Risk ≥ the campaign's `max_risk` | stopped | `risk_increase` |
| Best conversion ≤ `min_conversion_rate` | stopped | `performance_drop` |
| Alyssa pauses | paused | `paused` |

Every halt records *why* in `stop_reason`; a healthy campaign just stays active. `activeCampaigns()`
returns exactly the campaigns currently on autopilot.

## Monthly optimization

`optimize(metrics?)` refreshes the report, shifts traffic toward the winner (70/30), and bumps
`version` with `last_optimized_at`. The cadence defaults to monthly.

## Tenant isolation

Every method is tenant-scoped; campaigns never cross tenants, matching the RLS on `campaigns`.

## Wiring (Phase 2)

The engine is in-memory today. Phase 2 persists campaigns to `campaigns`, feeds real channel metrics
into `report`/`assess`, and runs `assess` and monthly `optimize` on a schedule so campaigns truly run
themselves between check-ins.
