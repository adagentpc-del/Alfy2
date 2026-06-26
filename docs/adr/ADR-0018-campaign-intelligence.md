# ADR-0018: Campaign Intelligence

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alyssa runs marketing across many channels — email, social, landing pages, funnels, outreach, lead
nurturing — and wants each campaign set up to learn and improve on its own: always test two variants,
report automatically, recommend improvements, optimize monthly, and keep running without babysitting
once approved. The platform already has the pieces this depends on: the Goal Engine (a campaign's
target), Persistent Approval (the standing approval that keeps a campaign running), and the Decision
Engine.

## Decision

Add a `campaign/` engine in `@alfy2/core`. A campaign is an A/B experiment with success metrics that
runs on autopilot after approval. Deterministic (no AI). Tenant-scoped.

### Six types, always A/B

`create` builds a campaign of one of six types (email, social, landing_page, funnel, outreach,
lead_nurturing) with a **Variant A / Variant B** pair (from caller drafts or per-type templates), one
or more **success metrics** (default primary metric per type), and **stop conditions**. It starts as a
draft.

### Automatic reporting + recommendations

`report` turns raw per-variant observations into conversion rates, picks the **winner** (by conversion
rate, with a minimum-conversions guard against noise), computes the **lift**, writes a summary, and
generates deterministic **improvement recommendations** (shift to the winner, iterate or retire the
loser, plus a type-specific lever). The report is stored on the campaign.

### Autopilot — continues until a stop fires

After `approve`, a campaign is `active` (autopilot). `assess(signals)` keeps it running unless a stop
condition fires, checked in priority order:

1. **goal reached** → `completed` (`stop_reason = goal_reached`)
2. **approval expired** → `stopped` (`approval_expired`)
3. **risk increase** (risk ≥ the campaign's `max_risk`) → `stopped` (`risk_increase`)
4. **performance drop** (best-variant conversion ≤ `min_conversion_rate`) → `stopped` (`performance_drop`)
5. **Alyssa pauses** → `paused` (`paused`)

Every halt records *why* in `stop_reason`. A healthy campaign simply stays `active`.

### Monthly optimization

`optimize` refreshes the report, shifts traffic toward the winner (0.7 / 0.3), and bumps `version` with
`last_optimized_at`. `optimization_cadence` defaults to `monthly`.

### Contracts & data

`packages/shared/src/contracts/campaign.ts`: `CampaignType`, `CampaignStatus`, `StopReason`, `Variant`,
`CampaignSuccessMetric`, `VariantResult`, `CampaignRecommendation`, `CampaignReport`, `StopConditions`,
`Campaign`, `CreateCampaignInput`, `CampaignMetricsInput`, `AssessSignals`. (The success-metric and
recommendation types are `Campaign`-prefixed to avoid colliding with the Agent Factory's `SuccessMetric`
and the Idea Builder's `Recommendation`.) Mirrored in Pydantic. Migration 0024 adds `campaigns`
(variants / metrics / stop_conditions / latest_report as `jsonb`) + 0025 deny-by-default RLS.

## Consequences

- Every campaign is an experiment by construction — there is no "ship one version and hope."
- Campaigns are self-driving but bounded: they keep running on their own yet can only stop for one of
  five explicit, recorded reasons, three of which (goal, approval, risk) tie directly into the Goal
  Engine, Persistent Approval, and the platform's risk notion.
- Optimization is mechanical and explainable (winner gets the traffic), not a black box.
- Wiring `assess`/`optimize` to run on a schedule, and feeding real channel metrics in, is Phase 2.
