-- =============================================================================
-- Migration: 0168_timeline_events.sql
-- Purpose:   Stand up the Alfy² Enterprise Memory Timeline — a single
--            `timeline_events` table holding a chronological history of business
--            launches, campaigns, product releases, major decisions, clients,
--            partnerships, financial milestones, failures, wins, hiring,
--            technology adoption, legal events, and media appearances — each
--            event linking related assets, agents, people, businesses, and
--            lessons. Implements the Memory Timeline on top of the tenant-scoped
--            platform.
--
-- MEMORY TIMELINE MODEL
--   - Each row is a recorded historical EVENT of one of 13 kinds, stamped with
--     when it actually happened (`occurred_at`) so the timeline can answer "when
--     did we first discuss this?" and "what happened after that decision?".
--   - Each event links the related assets, agents, people, and businesses, and
--     the lessons learned.
--   - Events are APPEND-ONLY: a row is a recorded historical fact, not edited in
--     place. There is no updated_at and no trigger — new history is appended
--     rather than mutating old events.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only history, so it
--     has none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0169_timeline_events_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- timeline_events — a single chronological event in the enterprise history, of
-- one of 13 kinds, stamped with when it occurred, linking related assets,
-- agents, people, businesses, and lessons learned. Append-only (no updated_at,
-- no trigger).
-- -----------------------------------------------------------------------------
create table if not exists timeline_events (
  id                   uuid              primary key default gen_random_uuid(),
  tenant_id            uuid              not null,
  kind                 text              not null
                                         check (kind in (
                                           'business_launch','campaign','product_release',
                                           'major_decision','client','partnership',
                                           'financial_milestone','failure','win','hiring',
                                           'technology_adoption','legal_event','media_appearance')),
  title                text              not null,
  occurred_at          timestamptz       not null,
  summary              text              not null default '',
  business_id          uuid,
  related_assets       jsonb             not null default '[]'::jsonb,
  related_agents       jsonb             not null default '[]'::jsonb,
  related_people       jsonb             not null default '[]'::jsonb,
  related_businesses   jsonb             not null default '[]'::jsonb,
  lessons_learned      jsonb             not null default '[]'::jsonb,
  created_at           timestamptz       not null default now()
);

create index if not exists timeline_events_tenant_occurred_idx
  on timeline_events (tenant_id, occurred_at);

create index if not exists timeline_events_tenant_kind_idx
  on timeline_events (tenant_id, kind);
