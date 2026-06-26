-- =============================================================================
-- Migration: 0115_intelligence_items.sql
-- Purpose:   Stand up the Alfy² Executive Intelligence Network (EIN) store — a
--            single `intelligence_items` table that holds actionable executive
--            intelligence (not summaries). Each article is scored across ten
--            dimensions, classified, and turned into an item that states why it
--            matters, which businesses and goals it affects, immediate actions,
--            future implications, confidence, sources, the related living
--            briefing, and follow-ups. Implements EIN on top of the tenant-scoped
--            platform.
--
-- INTELLIGENCE NETWORK MODEL
--   - Each row is a CAPTURED INTELLIGENCE ITEM produced from one article: the
--     engine writes its conclusions out once, at a point in time.
--   - `scores` carries the ten article scores (importance, urgency, opportunity,
--     risk, revenue_potential, innovation, implementation_difficulty,
--     compliance_risk, strategic_value, long_term_impact) plus the recommended
--     reading minutes; `classification` buckets the item into one of
--     ignore / interesting / monitor / research / immediate_action.
--   - `related_briefing_id` links the item to the living briefing for a
--     developing story (Alyssa never rereads the same story twice).
--   - Items are APPEND-ONLY: a row is a recorded assessment, not edited in place.
--     There is no updated_at and no trigger — successive captures append new
--     items rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0116_intelligence_items_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- intelligence_items — a captured executive intelligence item produced from one
-- scored, classified article. Holds the executive summary, deep dive, why it
-- matters, the businesses/goals affected, agents to notify, immediate actions,
-- future implications, the ten scores, classification, confidence, sources, the
-- related living briefing, and follow-up recommendations. Append-only (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists intelligence_items (
  id                         uuid              primary key default gen_random_uuid(),
  tenant_id                  uuid              not null,
  title                      text              not null,
  executive_summary          text              not null,
  deep_dive                  text              not null default '',
  why_it_matters             text              not null,
  businesses_affected        jsonb             not null default '[]'::jsonb,
  goals_affected             jsonb             not null default '[]'::jsonb,
  agents_to_notify           jsonb             not null default '[]'::jsonb,
  immediate_actions          jsonb             not null default '[]'::jsonb,
  future_implications        jsonb             not null default '[]'::jsonb,
  scores                     jsonb             not null,
  classification             text              not null
                                               check (classification in (
                                                 'ignore','interesting','monitor',
                                                 'research','immediate_action')),
  confidence                 double precision  not null
                                               check (confidence >= 0 and confidence <= 1),
  sources                    jsonb             not null default '[]'::jsonb,
  related_briefing_id        uuid,
  follow_up_recommendations  jsonb             not null default '[]'::jsonb,
  created_at                 timestamptz       not null default now()
);

create index if not exists intelligence_items_tenant_classification_idx
  on intelligence_items (tenant_id, classification);
