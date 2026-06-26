-- =============================================================================
-- Migration: 0164_opportunity_comparisons.sql
-- Purpose:   Stand up the Alfy² Opportunity Cost Engine — a single
--            `opportunity_comparisons` table that stores the engine's comparison
--            of options A/B/C/D, computing for each the expected value and
--            opportunity cost, then recommending the best financial / strategic /
--            long-term / low-risk / fastest / highest-leverage choice while always
--            showing what is NOT being chosen and why. Implements the Opportunity
--            Cost Engine on top of the tenant-scoped platform.
--
-- OPPORTUNITY COST MODEL
--   - Each row is a COMPUTED POINT-IN-TIME COMPARISON for one question: the
--     engine evaluates the options and writes the conclusions out as a dated
--     comparison (`created_at`).
--   - `evaluated` holds each option with its computed expected value,
--     opportunity cost (value forgone vs the best alternative), and composite
--     score.
--   - The comparison answers the operator's choice directly:
--       best_financial, best_strategic, best_long_term, best_low_risk, fastest,
--       highest_leverage.
--   - `not_chosen` records what is NOT being chosen, and why.
--   - Comparisons are APPEND-ONLY: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new comparisons rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0165_opportunity_comparisons_rls.sql. This file only defines structure; it
-- does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- opportunity_comparisons — a computed point-in-time comparison of options for
-- one question. Holds each evaluated option with its expected value and
-- opportunity cost, names the best financial / strategic / long-term / low-risk /
-- fastest / highest-leverage pick, records what is NOT being chosen, and gives a
-- recommendation. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists opportunity_comparisons (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  question          text              not null default '',
  evaluated         jsonb             not null default '[]'::jsonb,
  best_financial    text              not null,
  best_strategic    text              not null,
  best_long_term    text              not null,
  best_low_risk     text              not null,
  fastest           text              not null,
  highest_leverage  text              not null,
  not_chosen        jsonb             not null default '[]'::jsonb,
  recommendation    text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists opportunity_comparisons_tenant_created_idx
  on opportunity_comparisons (tenant_id, created_at);
