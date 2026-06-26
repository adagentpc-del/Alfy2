-- =============================================================================
-- Migration: 0070_vault_entries.sql
-- Purpose:   Stand up the Alfy² Knowledge Vault — a single `vault_entries` table
--            where every dropped item becomes extracted intelligence and then
--            execution. Implements the Knowledge Vault on top of the
--            tenant-scoped platform.
--
-- KNOWLEDGE VAULT MODEL
--   - The operator drops ANY of 13 input kinds into the vault:
--       book, pdf, youtube_transcript, podcast, course, screenshot, website,
--       github_repo, article, competitor_page, voice_note, meeting_notes,
--       random_idea.
--   - Each dropped item is processed into EXTRACTED INTELLIGENCE held on
--     `extraction`: key ideas, frameworks, tactics, quotes, examples, business
--     applications, monetization opportunities, related businesses, related
--     agents, related assets, and action items.
--   - The entry carries a generated `summary` and an `asset_id` pointing at the
--     produced asset, and tracks how the knowledge converts into execution:
--     `converted_to_actions` counts the actions spawned, and
--     `linked_business_ids` ties the entry to the businesses it feeds.
--   - The mission is the chain it drives:
--       knowledge → asset → campaign → conversation → conversion → cash.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0071_vault_entries_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- vault_entries — one dropped item (one of 13 input kinds) turned into extracted
-- intelligence (key ideas, frameworks, tactics, quotes, examples, business
-- applications, monetization opportunities, related businesses/agents/assets,
-- action items) on `extraction`, plus a generated summary and the produced
-- asset. Tracks conversion into execution via converted_to_actions and the
-- businesses it feeds via linked_business_ids. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists vault_entries (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  kind                  text              not null
                                          check (kind in (
                                            'book','pdf','youtube_transcript',
                                            'podcast','course','screenshot',
                                            'website','github_repo','article',
                                            'competitor_page','voice_note',
                                            'meeting_notes','random_idea')),
  title                 text              not null,
  summary               text              not null default '',
  extraction            jsonb             not null default '{}'::jsonb,
  asset_id              text              not null,
  converted_to_actions  integer           not null default 0,
  linked_business_ids   jsonb             not null default '[]'::jsonb,
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz
);

create index if not exists vault_entries_tenant_kind_idx
  on vault_entries (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- updated_at trigger for vault_entries. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_vault_entries on vault_entries;
create trigger set_updated_at_vault_entries
  before update on vault_entries
  for each row execute function set_updated_at();
