-- =============================================================================
-- Migration: 0036_workflow_roi.sql
-- Purpose:   Stand up the Alfy² Workflow ROI Tracking feature — a single
--            `workflow_roi` table that scores each automation's value against
--            its cost and ranks the portfolio. Implements Workflow ROI Tracking
--            on top of the tenant-scoped platform.
--
-- WORKFLOW ROI MODEL
--   - Each row captures one automation's value vs cost over a period:
--       * `metrics` (jsonb) holds the raw drivers the engine measures —
--         time_saved_hours, revenue_generated_usd, cost_reduced_usd,
--         errors_reduced, risk_reduced, conversion_improvement,
--         operating_cost_usd, model_tool_cost_usd, human_time_required_hours.
--       * `value_usd` is the dollarized value the workflow produced.
--       * `total_cost_usd` is the dollarized cost to run it.
--       * `net_value_usd` is value minus cost (the bottom line).
--       * `roi_score` is the ranked ROI (nullable until first computed).
--   - The engine emits a single recommendation per workflow — scale, pause,
--     improve, or delete — with a human-readable `rationale` explaining why.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural/entity snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0037_workflow_roi_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- workflow_roi — per-automation value vs cost, ranked, with a scale/pause/
-- improve/delete recommendation. `metrics` holds the measured drivers, the
-- *_usd columns dollarize value and cost, `net_value_usd` is the bottom line,
-- `roi_score` ranks the portfolio, and `recommendation`/`rationale` carry the
-- engine's call and reasoning. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists workflow_roi (
  id              uuid              primary key default gen_random_uuid(),
  tenant_id       uuid              not null,
  workflow_name   text              not null,
  metrics         jsonb             not null default '{}'::jsonb,
  value_usd       double precision  not null default 0,
  total_cost_usd  double precision  not null default 0,
  net_value_usd   double precision  not null default 0,
  roi_score       double precision,
  recommendation  text              not null
                                    check (recommendation in (
                                      'scale','pause','improve','delete')),
  rationale       text              not null default '',
  created_at      timestamptz       not null default now(),
  updated_at      timestamptz
);

create index if not exists workflow_roi_tenant_recommendation_idx
  on workflow_roi (tenant_id, recommendation);

create index if not exists workflow_roi_tenant_workflow_name_idx
  on workflow_roi (tenant_id, workflow_name);

-- -----------------------------------------------------------------------------
-- updated_at trigger for workflow_roi. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_workflow_roi on workflow_roi;
create trigger set_updated_at_workflow_roi
  before update on workflow_roi
  for each row execute function set_updated_at();
