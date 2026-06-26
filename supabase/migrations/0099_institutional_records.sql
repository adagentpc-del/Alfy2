-- =============================================================================
-- Migration: 0099_institutional_records.sql
-- Purpose:   Stand up the Alfy² Institutional Memory — a single
--            `institutional_records` table that captures the enterprise's
--            durable decision record. Implements Institutional Memory on top of
--            the tenant-scoped platform.
--
-- INSTITUTIONAL MEMORY MODEL
--   - The table captures the institution's hard-won knowledge across nine
--     `kind`s: decision rationale, rejected ideas, failed and successful
--     experiments, negotiation outcomes, lessons learned, vendor experiences,
--     client preferences, and implementation history.
--   - Every decision answers two questions directly: WHAT DID WE KNOW at the
--     time (`what_we_knew`) and WHY DID WE CHOOSE THIS (`why_chosen`), with the
--     `alternatives_rejected` we passed over recorded alongside.
--   - A record carries a `title`, free-form `detail`, optional `business_id`,
--     and `tags` for retrieval.
--   - Records are APPEND-ONLY: a record is a recorded fact, not edited in place.
--     There is no updated_at and no trigger — new knowledge appends new records
--     rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0100_institutional_records_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- institutional_records — a durable record of institutional knowledge: decision
-- rationale, rejected ideas, failed/successful experiments, negotiation
-- outcomes, lessons learned, vendor experiences, client preferences, and
-- implementation history. Every record answers what we knew and why we chose
-- this, with the alternatives we rejected. Append-only (no updated_at, no
-- trigger).
-- -----------------------------------------------------------------------------
create table if not exists institutional_records (
  id                     uuid        primary key default gen_random_uuid(),
  tenant_id              uuid        not null,
  kind                   text        not null
                                     check (kind in (
                                       'decision_rationale','rejected_idea',
                                       'failed_experiment','successful_experiment',
                                       'negotiation_outcome','lesson_learned',
                                       'vendor_experience','client_preference',
                                       'implementation_history')),
  title                  text        not null,
  detail                 text        not null default '',
  what_we_knew           text        not null default '',
  why_chosen             text        not null default '',
  alternatives_rejected  jsonb       not null default '[]'::jsonb,
  business_id            uuid,
  tags                   jsonb       not null default '[]'::jsonb,
  created_at             timestamptz not null default now()
);

create index if not exists institutional_records_tenant_kind_idx
  on institutional_records (tenant_id, kind);
