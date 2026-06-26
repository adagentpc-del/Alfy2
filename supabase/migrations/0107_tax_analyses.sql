-- =============================================================================
-- Migration: 0107_tax_analyses.sql
-- Purpose:   Stand up the Alfy² Legal Tax Strategy Analyzer — a single
--            `tax_analyses` table that stores computed analyses of LEGAL tax
--            optimization opportunities (avoidance, deferral, deduction,
--            structuring, planning — never evasion) for CPA/attorney review.
--            Implements the Tax Strategy Analyzer on top of the tenant-scoped
--            platform.
--
-- TAX STRATEGY MODEL
--   - Each row is a COMPUTED ANALYSIS for one subject: the engine analyzes the
--     financial picture and writes out the conclusions as a dated record
--     (`created_at`).
--   - `recommendations` holds the per-area tax recommendations the engine
--     produced (area, title, why it may apply, estimated benefit, risk,
--     complexity, documents needed, next step, advisor questions). Each
--     recommendation requires professional review.
--   - `disclaimer` carries the standing disclaimer — analysis, not advice;
--     legal optimization only. Alfy² prepares analysis, scenarios, questions,
--     and recommendations for CPA/attorney review; it does NOT provide final
--     legal or tax advice.
--   - Analyses are IMMUTABLE: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive analyses append
--     new rows rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0108_tax_analyses_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tax_analyses — a computed legal-tax-strategy analysis for one subject. Holds
-- the per-area recommendations (analysis only, for professional review) and the
-- standing disclaimer. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists tax_analyses (
  id               uuid              primary key default gen_random_uuid(),
  tenant_id        uuid              not null,
  subject          text              not null,
  recommendations  jsonb             not null default '[]'::jsonb,
  disclaimer       text              not null,
  created_at       timestamptz       not null default now()
);

create index if not exists tax_analyses_tenant_created_idx
  on tax_analyses (tenant_id, created_at);
