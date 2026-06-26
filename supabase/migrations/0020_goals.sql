-- =============================================================================
-- Migration: 0020_goals.sql
-- Purpose:   Stand up the Alfy² Goal Engine — a single `goals` table that drives
--            the operator's outcome-oriented planning loop. Implements the Goal
--            Engine model on top of the existing tenant-scoped platform.
--
-- GOAL ENGINE MODEL
--   - Nine goal types span the operator's life and businesses:
--       personal, financial, business, health, learning, relationships,
--       launches, sales, cash_flow.
--   - A goal moves through a lifecycle: draft → active → (paused | review_required)
--     → completed (or cancelled). Once a goal is APPROVED, the engine pursues it
--     continuously until it is completed, paused, cancelled, or flagged
--     review_required — it does not silently lapse.
--   - The strategic reasoning behind a goal is stored as JSON, not normalized:
--       * analysis (GoalAnalysis): current/desired state, the gap between them,
--         constraints, available resources, best_opportunities, the three
--         candidate paths, and the recommended_path.
--       * plan (GoalPlan): weekly_plan, daily_priorities, recommended_agents,
--         recommended_automations, expected_completion, and risk_analysis.
--   - Goals are recalculated as conditions change. Each recalculation bumps
--     `version` and stamps `last_recalculated_at`, so the analysis/plan always
--     reflect the latest pass.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0021_goals_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- goals — outcome the operator is pursuing, with its full analysis and plan.
-- A goal is one of nine types, carries a status lifecycle and a priority level,
-- and tracks measurable progress (metric/unit + baseline/current/target). The
-- strategic reasoning (analysis) and the execution plan (plan) are stored as
-- jsonb. `version` increments on each recalculation. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists goals (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  type                  text              not null
                                          check (type in (
                                            'personal','financial','business','health','learning',
                                            'relationships','launches','sales','cash_flow')),
  title                 text              not null,
  description           text              not null default '',
  status                text              not null default 'draft'
                                          check (status in (
                                            'draft','active','paused','cancelled',
                                            'completed','review_required')),
  approved              boolean           not null default false,
  business_id           uuid,
  metric                text,
  unit                  text,
  baseline_value        double precision,
  current_value         double precision,
  target_value          double precision,
  deadline              timestamptz,
  priority_level        text              not null
                                          check (priority_level in ('low','medium','high','critical')),
  analysis              jsonb             not null default '{}'::jsonb,
  plan                  jsonb             not null default '{}'::jsonb,
  version               integer           not null default 1 check (version > 0),
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz,
  last_recalculated_at  timestamptz
);

create index if not exists goals_tenant_status_idx
  on goals (tenant_id, status);

create index if not exists goals_tenant_type_idx
  on goals (tenant_id, type);

create index if not exists goals_tenant_business_idx
  on goals (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for goals. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_goals on goals;
create trigger set_updated_at_goals
  before update on goals
  for each row execute function set_updated_at();
