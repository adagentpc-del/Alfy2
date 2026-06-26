-- =============================================================================
-- Migration: 0129_pr_strategies.sql
-- Purpose:   Stand up the Alfy² PR Strategy feature — a single `pr_strategies`
--            table holding the public-relations / press strategy for a business:
--            its media angles, target publications and podcasts, founder story,
--            credibility proof, press-kit checklist, outreach templates, and
--            reputation risks. PR is now a standard business department (see
--            0131_business_departments_pr.sql).
--
-- PR STRATEGY MODEL
--   - Each row is a PR strategy for one business (business_name + optional
--     business_id FK-style reference to businesses.id).
--   - List-shaped fields (media_angles, target_publications, podcast_targets,
--     credibility_proof, press_kit_checklist, outreach_templates,
--     reputation_risks) are stored as jsonb arrays.
--   - founder_story_angle is the required narrative spine of the strategy.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0130_pr_strategies_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pr_strategies — the PR / press strategy for a business: media angles, target
-- publications and podcasts, the founder story angle, credibility proof, a
-- press-kit checklist, outreach templates, and reputation risks. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists pr_strategies (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  business_name        text        not null,
  business_id          uuid,
  media_angles         jsonb       not null default '[]'::jsonb,
  target_publications  jsonb       not null default '[]'::jsonb,
  podcast_targets      jsonb       not null default '[]'::jsonb,
  founder_story_angle  text        not null,
  credibility_proof    jsonb       not null default '[]'::jsonb,
  press_kit_checklist  jsonb       not null default '[]'::jsonb,
  outreach_templates   jsonb       not null default '[]'::jsonb,
  reputation_risks     jsonb       not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

create index if not exists pr_strategies_tenant_business_name_idx
  on pr_strategies (tenant_id, business_name);

-- -----------------------------------------------------------------------------
-- updated_at trigger for pr_strategies. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_pr_strategies on pr_strategies;
create trigger set_updated_at_pr_strategies
  before update on pr_strategies
  for each row execute function set_updated_at();
