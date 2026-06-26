-- =============================================================================
-- Migration: 0121_trends.sql
-- Purpose:   Stand up the Alfy² Future Trends Lab — a single `trends` table that
--            tracks developments over 6mo / 1yr / 3yr / 5yr / 10yr horizons with
--            likelihood, impact, affected industries/businesses, preparation
--            steps, skills/tech needed, investment opportunities, threats, and a
--            readiness score — preparing Alyssa before everyone else. Implements
--            the Future Trends Lab on top of the tenant-scoped platform.
--
-- FUTURE TRENDS MODEL
--   - Each row is a TRACKED TREND over one horizon: 6_months, 1_year, 3_years,
--     5_years, or 10_years.
--   - `likelihood` and `impact` are 0..1 estimates; `readiness_score`
--     (likelihood × impact) frames how ready Alyssa should be.
--   - The row carries the affected industries/businesses, preparation steps,
--     skills/technology needed, investment opportunities, and potential threats.
--   - Trends are MUTABLE: estimates and plans are revised as the development
--     unfolds. updated_at is maintained by the shared trigger function
--     set_updated_at() defined in 0001 (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0122_trends_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trends — a tracked development over one horizon, with likelihood, impact, the
-- affected industries/businesses, preparation steps, skills/technology needed,
-- investment opportunities, potential threats, and a readiness score. Estimates
-- and plans are revised over time. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists trends (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  name                      text              not null,
  horizon                   text              not null
                                              check (horizon in (
                                                '6_months','1_year','3_years',
                                                '5_years','10_years')),
  description               text              not null default '',
  likelihood                double precision  not null
                                              check (likelihood >= 0 and likelihood <= 1),
  impact                    double precision  not null
                                              check (impact >= 0 and impact <= 1),
  industries_affected       jsonb             not null default '[]'::jsonb,
  businesses_affected       jsonb             not null default '[]'::jsonb,
  preparation_steps         jsonb             not null default '[]'::jsonb,
  skills_needed             jsonb             not null default '[]'::jsonb,
  technology_needed         jsonb             not null default '[]'::jsonb,
  investment_opportunities  jsonb             not null default '[]'::jsonb,
  potential_threats         jsonb             not null default '[]'::jsonb,
  readiness_score           double precision  not null
                                              check (readiness_score >= 0 and readiness_score <= 1),
  created_at                timestamptz       not null default now(),
  updated_at                timestamptz
);

create index if not exists trends_tenant_horizon_idx
  on trends (tenant_id, horizon);

-- -----------------------------------------------------------------------------
-- updated_at trigger for trends. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_trends on trends;
create trigger set_updated_at_trends
  before update on trends
  for each row execute function set_updated_at();
