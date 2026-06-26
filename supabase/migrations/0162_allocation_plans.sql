-- =============================================================================
-- Migration: 0162_allocation_plans.sql
-- Purpose:   Stand up the Alfy² Executive Capital Allocator — a single
--            `allocation_plans` table that stores the engine's recommendation
--            for the highest-value allocation of the operator's limited capital
--            (time, money, energy, attention, relationships, reputation,
--            knowledge, technology, assets, employees, agents, automation
--            capacity) over a given horizon. Implements the Capital Allocator on
--            top of the tenant-scoped platform.
--
-- CAPITAL ALLOCATOR MODEL
--   - Each row is a COMPUTED POINT-IN-TIME RECOMMENDATION for one horizon: the
--     engine evaluates candidate uses of capital and writes the conclusions out
--     as a dated plan (`created_at`).
--   - The plan answers the operator's horizon question directly — morning
--     (daily) "what creates the highest return today?", weekly "where should we
--     invest next?", quarterly "what should we stop investing in?":
--       highest_roi, highest_leverage, highest_compounding,
--       highest_strategic_value, highest_founder_freedom.
--   - It NEVER optimizes one resource while destroying another: `tradeoffs`
--     surfaces what each top pick depletes, and `stop_investing_in` (quarterly)
--     names what to cut.
--   - Plans are APPEND-ONLY: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new plans rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0163_allocation_plans_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- allocation_plans — a computed point-in-time capital allocation recommendation
-- for one horizon. Names the highest-ROI / leverage / compounding / strategic /
-- founder-freedom pick, the recommendation, the trade-offs each top pick
-- depletes, and (quarterly) what to stop investing in. Append-only (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists allocation_plans (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  horizon                  text              not null
                                             check (horizon in ('daily','weekly','quarterly')),
  question                 text              not null,
  highest_roi              text,
  highest_leverage         text,
  highest_compounding      text,
  highest_strategic_value  text,
  highest_founder_freedom  text,
  recommendation           text              not null,
  tradeoffs                jsonb             not null default '[]'::jsonb,
  stop_investing_in        jsonb             not null default '[]'::jsonb,
  created_at               timestamptz       not null default now()
);

create index if not exists allocation_plans_tenant_horizon_idx
  on allocation_plans (tenant_id, horizon);
