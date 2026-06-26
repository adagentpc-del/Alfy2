-- =============================================================================
-- Migration: 0058_revenue_intel.sql
-- Purpose:   Stand up the Alfy² Revenue Command System — a single `revenue_intel`
--            table that stores computed revenue intelligence per business: the
--            fastest path to cash, the easiest offer to sell, the best lead
--            source, the highest-ROI campaign, stuck deals, and the next money
--            action. Implements Revenue Command on top of the tenant-scoped
--            platform.
--
-- REVENUE COMMAND MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SNAPSHOT for one business: the engine
--     analyzes the operator's revenue surface and writes the conclusions out as a
--     dated snapshot (`generated_at`).
--   - The snapshot answers the operator's money questions directly:
--       fastest_path_to_cash, easiest_offer_to_sell, best_lead_source,
--       highest_roi_campaign, next_money_action.
--   - `stuck_deals` holds the deals the engine flagged as stalled, and
--     `weighted_pipeline_usd` / `revenue_goal_usd` frame the snapshot against the
--     operator's target.
--   - Snapshots are IMMUTABLE: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new snapshots rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0059_revenue_intel_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- revenue_intel — a computed point-in-time revenue snapshot for one business.
-- Holds the fastest path to cash, easiest offer to sell, best lead source,
-- highest-ROI campaign, stuck deals, and next money action, framed against the
-- weighted pipeline and revenue goal. Immutable (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists revenue_intel (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  business_name          text              not null,
  generated_at           timestamptz       not null default now(),
  fastest_path_to_cash   text              not null default '',
  easiest_offer_to_sell  text              not null default '',
  best_lead_source       text              not null default '',
  highest_roi_campaign   text              not null default '',
  stuck_deals            jsonb             not null default '[]'::jsonb,
  next_money_action      text              not null default '',
  weighted_pipeline_usd  double precision  not null default 0,
  revenue_goal_usd       double precision  not null default 0,
  created_at             timestamptz       not null default now()
);

create index if not exists revenue_intel_tenant_business_idx
  on revenue_intel (tenant_id, business_name);
