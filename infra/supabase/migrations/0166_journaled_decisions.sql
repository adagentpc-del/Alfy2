-- =============================================================================
-- Migration: 0166_journaled_decisions.sql
-- Purpose:   Stand up the Alfy² Executive Decision Journal — a single
--            `journaled_decisions` table that records every major decision (the
--            decision, alternatives, reasoning, data available, assumptions,
--            risks, expected outcome) and schedules reviews at 30, 90, and 365
--            days to record the actual outcome and lessons learned, improving
--            future recommendations and surfacing recurring decision patterns.
--            Implements the Decision Journal on top of the tenant-scoped
--            platform.
--
-- DECISION JOURNAL MODEL
--   - Each row is a journaled decision: what was decided, the alternatives
--     considered, the reasoning, the data available, the assumptions, the risks,
--     and the expected outcome at the time the decision was made (`decided_at`).
--   - `reviews_due` maps each review window (30_day / 90_day / 1_year) to its due
--     date; `reviewed_windows` records which windows have been reviewed.
--   - At review time the row is UPDATED in place to fill in `actual_outcome` and
--     `lessons_learned` — so the table is MUTABLE: it carries updated_at and the
--     shared set_updated_at() trigger from 0001.
--   - `category` is a tag for pattern detection (e.g. "hiring", "pricing").
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0167_journaled_decisions_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- journaled_decisions — a recorded major decision with its alternatives,
-- reasoning, data, assumptions, risks, and expected outcome, plus a review
-- schedule (reviews_due) and the windows already reviewed. Updated in place at
-- review time to capture actual_outcome and lessons_learned. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists journaled_decisions (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  decision          text              not null,
  alternatives      jsonb             not null default '[]'::jsonb,
  reasoning         text              not null default '',
  data_available    jsonb             not null default '[]'::jsonb,
  assumptions       jsonb             not null default '[]'::jsonb,
  risks             jsonb             not null default '[]'::jsonb,
  expected_outcome  text              not null default '',
  category          text              not null default '',
  business_id       uuid,
  actual_outcome    text              not null default '',
  lessons_learned   jsonb             not null default '[]'::jsonb,
  reviews_due       jsonb             not null default '{}'::jsonb,
  reviewed_windows  jsonb             not null default '[]'::jsonb,
  decided_at        timestamptz       not null default now(),
  created_at        timestamptz       not null default now(),
  updated_at        timestamptz
);

create index if not exists journaled_decisions_tenant_category_idx
  on journaled_decisions (tenant_id, category);

-- -----------------------------------------------------------------------------
-- updated_at trigger for journaled_decisions. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_journaled_decisions on journaled_decisions;
create trigger set_updated_at_journaled_decisions
  before update on journaled_decisions
  for each row execute function set_updated_at();
