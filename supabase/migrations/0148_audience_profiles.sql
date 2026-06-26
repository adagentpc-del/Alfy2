-- =============================================================================
-- Migration: 0148_audience_profiles.sql
-- Purpose:   Stand up the Alfy² Audience Intelligence output — a single
--            `audience_profiles` table that holds, per audience, a distilled
--            profile: its biggest fears and goals, the language it uses, its
--            objections, desires, misconceptions, favorite content, and best
--            offers, plus the single highest-impact messaging recommendation.
--            Implements Audience Intelligence on top of the tenant-scoped
--            platform.
--
-- AUDIENCE INTELLIGENCE MODEL
--   - Each row is ONE profile for ONE named audience, distilled from the raw
--     signals (questions, comments, DMs, emails, sales calls, feedback, searches,
--     support tickets) the engine ingests.
--   - The eight list fields (biggest_fears, biggest_goals, language_used,
--     objections, desires, misconceptions, favorite_content, best_offers) are
--     arrays; `messaging_recommendation` is the single highest-impact change and
--     `signal_count` records how many signals fed the profile.
--   - A profile is re-derived as new signals arrive, so the engine UPSERTS it:
--     the table is MUTABLE, carries updated_at + the shared trigger, and is keyed
--     `unique (tenant_id, audience_name)`.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0149_audience_profiles_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- audience_profiles — a distilled profile for one named audience: its fears,
-- goals, language, objections, desires, misconceptions, favorite content, and
-- best offers, plus the highest-impact messaging recommendation and the count of
-- signals it was built from. Upserted per (tenant, audience_name). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists audience_profiles (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  audience_name             text              not null,
  business_id               uuid,
  biggest_fears             jsonb             not null default '[]'::jsonb,
  biggest_goals             jsonb             not null default '[]'::jsonb,
  language_used             jsonb             not null default '[]'::jsonb,
  objections                jsonb             not null default '[]'::jsonb,
  desires                   jsonb             not null default '[]'::jsonb,
  misconceptions            jsonb             not null default '[]'::jsonb,
  favorite_content          jsonb             not null default '[]'::jsonb,
  best_offers               jsonb             not null default '[]'::jsonb,
  messaging_recommendation  text              not null,
  signal_count              integer           not null default 0 check (signal_count >= 0),
  created_at                timestamptz       not null default now(),
  updated_at                timestamptz,
  unique (tenant_id, audience_name)
);

create index if not exists audience_profiles_tenant_name_idx
  on audience_profiles (tenant_id, audience_name);

-- -----------------------------------------------------------------------------
-- updated_at trigger for audience_profiles. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_audience_profiles on audience_profiles;
create trigger set_updated_at_audience_profiles
  before update on audience_profiles
  for each row execute function set_updated_at();
