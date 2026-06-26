-- =============================================================================
-- Migration: 0042_source_records.sql
-- Purpose:   Stand up the Alfy² Source-of-Truth Management feature — a single
--            `source_records` table that lets the operator distinguish the
--            provenance and trustworthiness of every piece of knowledge the
--            system relies on. Built on top of the tenant-scoped platform.
--
-- SOURCE-OF-TRUTH MODEL
--   - Nine record kinds distinguish what a statement actually is:
--       verified_fact, assumption, outdated, user_preference, inferred_pattern,
--       external_research, document, contact, financial_data.
--   - Every record carries the metadata needed to trust (or distrust) it:
--       * source            — where the statement came from.
--       * confidence        — how sure we are, in [0,1].
--       * owner             — who is responsible for the statement.
--       * last_verified_at  — when it was last confirmed against reality.
--       * freshness         — fresh → aging → stale → expired as it ages.
--       * update_trigger    — what event should prompt a re-verification.
--   - Records can link back to a memory entry (`memory_id`) and carry free-form
--     `tags` for retrieval/grouping.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0043_source_records_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- source_records — a single piece of knowledge with its provenance. One of nine
-- kinds (verified_fact, assumption, outdated, user_preference, inferred_pattern,
-- external_research, document, contact, financial_data). Every record carries
-- source, confidence, owner, last_verified_at, freshness, and update_trigger so
-- the system can reason about how much to trust it and when to re-verify.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists source_records (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  kind              text              not null
                                      check (kind in (
                                        'verified_fact','assumption','outdated',
                                        'user_preference','inferred_pattern',
                                        'external_research','document','contact',
                                        'financial_data')),
  statement         text              not null,
  source            text              not null,
  confidence        double precision  not null default 0.5
                                      check (confidence >= 0 and confidence <= 1),
  owner             text              not null,
  last_verified_at  timestamptz,
  freshness         text              not null default 'fresh'
                                      check (freshness in (
                                        'fresh','aging','stale','expired')),
  update_trigger    text              not null default '',
  memory_id         text,
  tags              jsonb             not null default '[]'::jsonb,
  created_at        timestamptz       not null default now(),
  updated_at        timestamptz
);

create index if not exists source_records_tenant_kind_idx
  on source_records (tenant_id, kind);

create index if not exists source_records_tenant_freshness_idx
  on source_records (tenant_id, freshness);

-- -----------------------------------------------------------------------------
-- updated_at trigger for source_records. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_source_records on source_records;
create trigger set_updated_at_source_records
  before update on source_records
  for each row execute function set_updated_at();
