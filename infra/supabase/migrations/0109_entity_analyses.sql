-- =============================================================================
-- Migration: 0109_entity_analyses.sql
-- Purpose:   Stand up the Alfy² Entity Structure Optimizer — a single
--            `entity_analyses` table that stores computed analyses of whether
--            each business should remain an LLC, elect S Corp treatment, convert
--            to C Corp, create subsidiaries, or sit under a holding company.
--            Analysis only, for CPA/attorney review. Implements the Entity
--            Structure Optimizer on top of the tenant-scoped platform.
--
-- ENTITY STRUCTURE MODEL
--   - Six entity structures span the optimizer's surface:
--       sole_prop, llc, llc_s_corp, c_corp, holding_company,
--       subsidiary_under_holding.
--   - Each row is a COMPUTED ANALYSIS for one business: the engine evaluates the
--     business from revenue, profit, payroll, investor plans, exit potential,
--     liability, owners, IP, and future SaaS, and writes out the conclusions as
--     a dated record (`created_at`).
--   - `current_structure` and `recommended_structure` capture the move; the
--     engine explains it in `why_recommended`.
--   - `alternatives` holds the candidate structures with their trade-offs;
--     `cpa_questions`, `attorney_questions`, and `action_checklist` prep the
--     operator for professional review. `risk_level` rates the recommendation,
--     and `requires_professional_review` is always true.
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
-- RLS policies and the deny-by-default posture live in
-- 0110_entity_analyses_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- entity_analyses — a computed entity-structure analysis for one business.
-- Captures the current and recommended structure, why it is recommended, the
-- candidate alternatives with trade-offs, CPA/attorney questions, an action
-- checklist, and the risk level. Always requires professional review.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists entity_analyses (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  business_name          text              not null,
  current_structure      text              not null
                                           check (current_structure in (
                                             'sole_prop','llc','llc_s_corp','c_corp',
                                             'holding_company','subsidiary_under_holding')),
  recommended_structure  text              not null
                                           check (recommended_structure in (
                                             'sole_prop','llc','llc_s_corp','c_corp',
                                             'holding_company','subsidiary_under_holding')),
  why_recommended        text              not null,
  alternatives           jsonb             not null default '[]'::jsonb,
  cpa_questions          jsonb             not null default '[]'::jsonb,
  attorney_questions     jsonb             not null default '[]'::jsonb,
  action_checklist       jsonb             not null default '[]'::jsonb,
  risk_level             text              not null check (risk_level in ('low','medium','high')),
  requires_professional_review  boolean    not null default true,
  created_at             timestamptz       not null default now()
);

create index if not exists entity_analyses_tenant_business_idx
  on entity_analyses (tenant_id, business_name);
