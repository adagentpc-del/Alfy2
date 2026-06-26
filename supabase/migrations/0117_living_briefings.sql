-- =============================================================================
-- Migration: 0117_living_briefings.sql
-- Purpose:   Stand up the Alfy² Executive Intelligence Network living-briefing
--            store — a single `living_briefings` table where a developing story
--            becomes ONE evolving record with a timeline, so Alyssa never
--            rereads the same story twice. Implements the living-briefing half
--            of EIN on top of the tenant-scoped platform.
--
-- LIVING BRIEFING MODEL
--   - Each row is ONE evolving record for a developing story, keyed by
--     `story_key`. Intelligence items sharing a story key roll into the same
--     living briefing.
--   - `current_state` holds the latest synthesis; `timeline` accumulates the
--     story's entries (each an {at, headline, note}) as it develops.
--   - Living briefings are MUTABLE: as a story develops, `current_state`,
--     `timeline`, and `businesses_affected` are updated in place. updated_at is
--     maintained by the shared trigger function set_updated_at() defined in 0001
--     (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in
-- 0118_living_briefings_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- living_briefings — one evolving record for a developing story, keyed by
-- story_key. Holds the title, current state, the accumulating timeline, and the
-- businesses affected. Updated in place as the story develops. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists living_briefings (
  id                   uuid              primary key default gen_random_uuid(),
  tenant_id            uuid              not null,
  story_key            text              not null,
  title                text              not null,
  current_state        text              not null,
  timeline             jsonb             not null default '[]'::jsonb,
  businesses_affected  jsonb             not null default '[]'::jsonb,
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz,
  unique (tenant_id, story_key)
);

create index if not exists living_briefings_tenant_story_idx
  on living_briefings (tenant_id, story_key);

-- -----------------------------------------------------------------------------
-- updated_at trigger for living_briefings. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_living_briefings on living_briefings;
create trigger set_updated_at_living_briefings
  before update on living_briefings
  for each row execute function set_updated_at();
