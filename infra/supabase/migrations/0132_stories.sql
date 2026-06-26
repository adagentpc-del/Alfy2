-- =============================================================================
-- Migration: 0132_stories.sql
-- Purpose:   Stand up the Alfy² Story Mining Engine — a single `stories` table
--            that captures every business experience as a reusable story (hook,
--            conflict, lesson, emotion, transformation, why it matters, audience,
--            business tie-in, CTA, proof needed, best channels, urgency). Implements
--            Story Mining on top of the tenant-scoped platform. See
--            docs/adr/ADR-0074-story-mining.md.
--
-- STORY MINING MODEL
--   - Each row is a CAPTURE RECORD: the engine mines one raw experience into a
--     story and writes it out. The raw experience came from one of twelve sources
--     (business_activity, intelligence_update, failure, win, client_story, meeting,
--     travel, technology, personal_lesson, relationship, news, book).
--   - `best_channels` records which of the story channels (podcast, pr, social,
--     newsletter, sales, investor_update, talk, case_study) the story serves.
--   - `urgency` frames how time-sensitive the story is
--     (evergreen, this_month, this_week, now).
--   - Stories are APPEND-ONLY: a mined story is a recorded capture, not edited in
--     place. There is no updated_at and no trigger — re-mining appends new rows
--     rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0133_stories_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- stories — a mined story captured from one raw experience, with its hook,
-- conflict, lesson, emotion, transformation, why it matters, audience, business
-- tie-in, CTA, proof needed, best channels, and urgency. Append-only (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists stories (
  id               uuid              primary key default gen_random_uuid(),
  tenant_id        uuid              not null,
  source           text              not null
                                     check (source in (
                                       'business_activity','intelligence_update','failure',
                                       'win','client_story','meeting','travel','technology',
                                       'personal_lesson','relationship','news','book')),
  hook             text              not null,
  conflict         text              not null default '',
  lesson           text              not null default '',
  emotion          text              not null default '',
  transformation   text              not null default '',
  why_it_matters   text              not null,
  audience         text              not null default '',
  business_tie_in  text              not null default '',
  cta              text              not null default '',
  proof_needed     jsonb             not null default '[]'::jsonb,
  best_channels    jsonb             not null default '[]'::jsonb,
  urgency          text              not null default 'evergreen'
                                     check (urgency in (
                                       'evergreen','this_month','this_week','now')),
  business_id      uuid,
  created_at       timestamptz       not null default now()
);

create index if not exists stories_tenant_source_idx
  on stories (tenant_id, source);
