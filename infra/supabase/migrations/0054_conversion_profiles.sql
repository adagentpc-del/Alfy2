-- =============================================================================
-- Migration: 0054_conversion_profiles.sql
-- Purpose:   Stand up the Alfy² Conversion Engine — a single
--            `conversion_profiles` table that tracks and improves conversion
--            across the operator's 11 conversion surfaces. Implements the
--            Conversion Engine on top of the tenant-scoped platform.
--
-- CONVERSION ENGINE MODEL
--   - The engine tracks and improves conversion across 11 surfaces, and keeps
--     one profile per business it is optimizing.
--   - Each profile maintains the business baseline — `baseline_conversion` and
--     `baseline_revenue_per_unit_usd` — that every test is measured against.
--   - `active_tests` holds the experiments currently in flight; `winning_copy`
--     and `losing_copy` accumulate the copy the engine has proven out (or ruled
--     out); `objections` records the objections the engine is working to defuse;
--     and `best_offers` holds the offers that have converted best so far.
--   - `next_optimization` names the single highest-leverage move the engine will
--     make next.
--   - The engine optimizes for REVENUE, not vanity metrics: `revenue_focused`
--     is true by default, anchoring every decision on revenue impact rather than
--     surface-level engagement.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0055_conversion_profiles_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- conversion_profiles — the Conversion Engine's per-business profile. Maintains
-- the business baseline (conversion + revenue per unit), the active tests in
-- flight, the winning/losing copy proven out over time, the objections being
-- defused, the best-converting offers, and the next optimization to run. The
-- engine optimizes for revenue, not vanity — revenue_focused is true by default.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists conversion_profiles (
  id                            uuid              primary key default gen_random_uuid(),
  tenant_id                     uuid              not null,
  business_id                   uuid,
  business_name                 text              not null,
  baseline_conversion           double precision  not null default 0,
  baseline_revenue_per_unit_usd double precision  not null default 0,
  active_tests                  jsonb             not null default '[]'::jsonb,
  winning_copy                  jsonb             not null default '[]'::jsonb,
  losing_copy                   jsonb             not null default '[]'::jsonb,
  objections                    jsonb             not null default '[]'::jsonb,
  best_offers                   jsonb             not null default '[]'::jsonb,
  next_optimization             text              not null default '',
  revenue_focused               boolean           not null default true,
  created_at                    timestamptz       not null default now(),
  updated_at                    timestamptz,
  unique (tenant_id, business_name)
);

create index if not exists conversion_profiles_tenant_business_idx
  on conversion_profiles (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for conversion_profiles. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_conversion_profiles on conversion_profiles;
create trigger set_updated_at_conversion_profiles
  before update on conversion_profiles
  for each row execute function set_updated_at();
