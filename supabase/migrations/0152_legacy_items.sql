-- =============================================================================
-- Migration: 0152_legacy_items.sql
-- Purpose:   Stand up the Alfy² Legacy Engine — a single `legacy_items` table
--            that captures every meaningful framework, playbook, operating
--            manual, podcast lesson, book, talk, business system, decision
--            journal, mistake, and success, and records the legacy forms each
--            piece of repeatable knowledge should become. Implements the Legacy
--            Engine (ADR-0083) on top of the tenant-scoped platform.
--
-- LEGACY MODEL
--   - Each row is a CAPTURED legacy item of one `kind` (ten kinds spanning the
--     operator's body of IP), with its title and detail.
--   - `repeatability` (0..1) and `strategic_value` (0..1) drive the engine's
--     `recommended_forms` (sop, founderos_feature, course, podcast_episode,
--     keynote, book_chapter, licensing_opportunity, consulting_framework) and
--     the `legacy_score` (0..1, long-term legacy value = repeatability ×
--     strategic value, weighted).
--   - Captured items are APPEND-ONLY / IMMUTABLE: a row is a recorded capture,
--     not edited in place. There is no updated_at and no trigger — re-capturing
--     appends new items rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0153_legacy_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- legacy_items — a captured legacy item of one kind, with its repeatability,
-- strategic value, recommended legacy forms, and legacy score. Append-only
-- (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists legacy_items (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  kind               text              not null
                                       check (kind in (
                                         'framework','playbook','operating_manual',
                                         'podcast_lesson','book','talk','business_system',
                                         'decision_journal','mistake','success')),
  title              text              not null,
  detail             text              not null default '',
  repeatability      double precision  not null default 0.5 check (repeatability >= 0 and repeatability <= 1),
  strategic_value    double precision  not null default 0.5 check (strategic_value >= 0 and strategic_value <= 1),
  recommended_forms  jsonb             not null default '[]'::jsonb,
  legacy_score       double precision  not null default 0 check (legacy_score >= 0 and legacy_score <= 1),
  created_at         timestamptz       not null default now()
);

create index if not exists legacy_items_tenant_kind_idx
  on legacy_items (tenant_id, kind);
