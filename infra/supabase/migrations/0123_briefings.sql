-- =============================================================================
-- Migration: 0123_briefings.sql
-- Purpose:   Stand up the Alfy² Briefing Engine — a single `briefings` table
--            that stores the four assembled executive briefings (morning, lunch,
--            evening, weekly), each built from already-summarized inputs.
--            Implements the Briefing Engine on top of the tenant-scoped platform.
--
-- BRIEFING ENGINE MODEL
--   - Each row is an ASSEMBLED BRIEFING of one `kind`:
--       morning  — today's priorities, revenue, follow-ups, blocked, calendar,
--                  news lanes, agent recs (~5 min).
--       lunch    — a learning/intelligence update: top 3 worth reading, why,
--                  action, save/research/implement.
--       evening  — close the day: wins/losses/money, what didn't move,
--                  follow-ups, lessons, tomorrow; saves reflections to memory.
--       weekly   — a strategic intelligence report: opportunities, risks,
--                  updates, predictions, next-week focus.
--   - `sections` holds the assembled {heading, items} blocks; `questions` holds
--     the (evening) questions to close the day; `estimated_reading_minutes`
--     frames the read; `saved_reflection_count` records how many reflections
--     were persisted to Institutional Memory.
--   - Briefings are APPEND-ONLY: each is a dated, recorded assembly, not edited
--     in place. There is no updated_at and no trigger — each run appends a new
--     briefing rather than mutating an old one.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0124_briefings_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- briefings — an assembled executive briefing of one kind (morning, lunch,
-- evening, weekly). Holds the greeting, the assembled sections, the (evening)
-- questions, the estimated reading minutes, and the count of reflections saved
-- to Institutional Memory. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists briefings (
  id                          uuid              primary key default gen_random_uuid(),
  tenant_id                   uuid              not null,
  kind                        text              not null
                                                check (kind in (
                                                  'morning','lunch','evening','weekly')),
  date_label                  text              not null default '',
  greeting                    text              not null,
  sections                    jsonb             not null default '[]'::jsonb,
  questions                   jsonb             not null default '[]'::jsonb,
  estimated_reading_minutes   double precision  not null default 0,
  saved_reflection_count      integer           not null default 0,
  created_at                  timestamptz       not null default now()
);

create index if not exists briefings_tenant_kind_idx
  on briefings (tenant_id, kind);
