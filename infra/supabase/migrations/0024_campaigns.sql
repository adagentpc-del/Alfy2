-- =============================================================================
-- Migration: 0024_campaigns.sql
-- Purpose:   Stand up the Alfy² Campaign Intelligence feature — a single
--            `campaigns` table that drives the operator's marketing/outreach
--            execution loop. Implements Campaign Intelligence on top of the
--            tenant-scoped platform.
--
-- CAMPAIGN INTELLIGENCE MODEL
--   - Six campaign types span the operator's growth surface:
--       email, social, landing_page, funnel, outreach, lead_nurturing.
--   - Every campaign is run as an A/B test: `variants` holds the variant pair
--     the engine pits against each other, and `success_metrics` holds the
--     outcomes the campaign is judged against.
--   - The engine generates automatic reporting + recommendations: the most
--     recent generated report (performance, A/B winner, and recommended next
--     actions) is stored on `latest_report`.
--   - Campaigns self-optimize on a cadence — `optimization_cadence` is 'monthly'
--     by default (or 'none'); each optimization pass stamps `last_optimized_at`
--     and bumps `version`.
--   - A campaign moves through a lifecycle:
--       draft → active → (paused) → completed (or stopped).
--   - Once APPROVED, a campaign runs on AUTOPILOT — the engine keeps executing
--     and optimizing it without a fresh approval each cycle — until a stop
--     condition fires. `stop_conditions` (min_conversion_rate, max_risk,
--     goal_id, approval_id) define when to halt, and the reason the campaign
--     left autopilot is recorded in `stop_reason`:
--       goal_reached, performance_drop, risk_increase, approval_expired,
--       paused, manual.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0025_campaigns_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- campaigns — a marketing/outreach campaign the operator is running, with its
-- A/B variant pair, success metrics, stop conditions, and latest generated
-- report. One of six types, carries a status lifecycle, and (once approved) runs
-- on autopilot until a stop condition fires — the reason is recorded in
-- stop_reason. `optimization_cadence` drives self-optimization; each pass stamps
-- last_optimized_at and bumps `version`. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists campaigns (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  type                  text              not null
                                          check (type in (
                                            'email','social','landing_page',
                                            'funnel','outreach','lead_nurturing')),
  name                  text              not null,
  objective             text              not null default '',
  business_id           uuid,
  goal_id               uuid,
  approval_id           uuid,
  status                text              not null default 'draft'
                                          check (status in (
                                            'draft','active','paused','completed','stopped')),
  stop_reason           text              check (stop_reason in (
                                            'goal_reached','performance_drop','risk_increase',
                                            'approval_expired','paused','manual')),
  variants              jsonb             not null default '[]'::jsonb,
  success_metrics       jsonb             not null default '[]'::jsonb,
  stop_conditions       jsonb             not null default '{}'::jsonb,
  optimization_cadence  text              not null default 'monthly'
                                          check (optimization_cadence in ('monthly','none')),
  latest_report         jsonb,
  version               integer           not null default 1 check (version > 0),
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz,
  last_optimized_at     timestamptz
);

create index if not exists campaigns_tenant_status_idx
  on campaigns (tenant_id, status);

create index if not exists campaigns_tenant_type_idx
  on campaigns (tenant_id, type);

create index if not exists campaigns_tenant_business_idx
  on campaigns (tenant_id, business_id);

create index if not exists campaigns_tenant_goal_idx
  on campaigns (tenant_id, goal_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for campaigns. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_campaigns on campaigns;
create trigger set_updated_at_campaigns
  before update on campaigns
  for each row execute function set_updated_at();
