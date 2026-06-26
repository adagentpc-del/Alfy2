-- =============================================================================
-- Migration: 0125_episode_plans.sql
-- Purpose:   Stand up the Alfy² Podcast Studio OS feature — a single
--            `episode_plans` table that drives "Decoded with Alyssa DelTorre"
--            from idea to published episode to monetization. Derived from the
--            EpisodePlanSchema contract in packages/shared/src/contracts/
--            podcast-studio.ts. See docs/adr/ADR-0071-podcast-studio.md.
--
-- PODCAST STUDIO MODEL
--   - Each episode plan moves through a stage lifecycle:
--       idea → researched → scheduled → recorded → produced → published.
--   - For every idea the engine fleshes out a full plan: title, hook, premise,
--     why_now, target_audience, key_story, talking_points, guest_fit,
--     business_tie_in, monetization_angle, clips_to_create, cta,
--     related_businesses, and assets_needed.
--   - Array-shaped fields (talking_points, clips_to_create, related_businesses,
--     assets_needed) are stored as jsonb arrays.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0126_episode_plans_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- episode_plans — a fully fleshed podcast episode plan, carried through its
-- stage lifecycle from idea to published. Holds the creative brief (hook,
-- premise, why_now, key_story, talking_points), the business angle
-- (business_tie_in, monetization_angle, related_businesses), and the production
-- needs (clips_to_create, cta, assets_needed). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists episode_plans (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  stage               text        not null default 'idea'
                                  check (stage in (
                                    'idea','researched','scheduled',
                                    'recorded','produced','published')),
  title               text        not null,
  hook                text        not null,
  premise             text        not null,
  why_now             text        not null,
  target_audience     text        not null default '',
  key_story           text        not null default '',
  talking_points      jsonb       not null default '[]'::jsonb,
  guest_fit           text        not null default '',
  business_tie_in     text        not null default '',
  monetization_angle  text        not null default '',
  clips_to_create     jsonb       not null default '[]'::jsonb,
  cta                 text        not null default '',
  related_businesses  jsonb       not null default '[]'::jsonb,
  assets_needed       jsonb       not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

create index if not exists episode_plans_tenant_stage_idx
  on episode_plans (tenant_id, stage);

-- -----------------------------------------------------------------------------
-- updated_at trigger for episode_plans. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_episode_plans on episode_plans;
create trigger set_updated_at_episode_plans
  before update on episode_plans
  for each row execute function set_updated_at();
