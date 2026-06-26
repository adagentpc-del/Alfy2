-- =============================================================================
-- Migration: 0050_ingested_items.sql
-- Purpose:   Stand up the Alfy² Knowledge Ingestion Engine — a single
--            `ingested_items` table that processes anything the operator
--            uploads or saves into structured, actionable knowledge.
--
-- KNOWLEDGE INGESTION MODEL
--   The engine ingests anything uploaded or saved — books, PDFs, YouTube/podcast
--   transcripts, courses, articles, screenshots, notes, videos, github repos, and
--   competitor pages (`source_type`) — and processes each into:
--     - a `summary` of the material;
--     - the `frameworks` and `tactics` it teaches;
--     - `business_applications` (how it can be used) and `applies_to` (which
--       business it applies to);
--     - `monetization_use_cases` (ways to turn it into revenue);
--     - `suggested_sops` and `suggested_agents` it implies building;
--     - an Asset Library reference (`asset_id`) for the stored source; and
--     - links back to the operator's `linked_goals`, `linked_campaigns`, and
--       `linked_businesses`.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0051_ingested_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ingested_items — a single piece of knowledge the operator uploaded or saved,
-- processed by the ingestion engine into a summary, the frameworks and tactics
-- it teaches, business applications, which business it applies to, monetization
-- use cases, suggested SOPs/agents, an Asset Library reference, and links back to
-- goals/campaigns/businesses. One of eleven source types. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists ingested_items (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  source_type             text              not null
                                            check (source_type in (
                                              'book','pdf','youtube_transcript','podcast',
                                              'course','article','screenshot','note','video',
                                              'github_repo','competitor_page')),
  title                   text              not null,
  location                text              not null default '',
  summary                 text              not null default '',
  frameworks              jsonb             not null default '[]'::jsonb,
  tactics                 jsonb             not null default '[]'::jsonb,
  business_applications   jsonb             not null default '[]'::jsonb,
  applies_to              jsonb             not null default '[]'::jsonb,
  monetization_use_cases  jsonb             not null default '[]'::jsonb,
  suggested_sops          jsonb             not null default '[]'::jsonb,
  suggested_agents        jsonb             not null default '[]'::jsonb,
  asset_id                text,
  linked_goals            jsonb             not null default '[]'::jsonb,
  linked_campaigns        jsonb             not null default '[]'::jsonb,
  linked_businesses       jsonb             not null default '[]'::jsonb,
  created_at              timestamptz       not null default now(),
  updated_at              timestamptz
);

create index if not exists ingested_items_tenant_source_type_idx
  on ingested_items (tenant_id, source_type);

-- -----------------------------------------------------------------------------
-- updated_at trigger for ingested_items. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_ingested_items on ingested_items;
create trigger set_updated_at_ingested_items
  before update on ingested_items
  for each row execute function set_updated_at();
