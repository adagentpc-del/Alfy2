-- =============================================================================
-- Migration: 0101_workflow_evaluations.sql
-- Purpose:   Stand up the Alfy² Continuous Improvement Engine — a single
--            `workflow_evaluations` table that records the engine's standing
--            verdict on every workflow the operator runs.
--
-- CONTINUOUS IMPROVEMENT ENGINE
--   - The engine evaluates EVERY workflow against a fixed dimension set:
--       speed, quality, cost, conversion, reliability, user-effort.
--     Per-dimension scores and supporting evidence live on `metrics`.
--   - Each evaluation rolls up to a single normalized `health_score` in [0,1]
--     (0 = failing, 1 = optimal), so workflows can be ranked and triaged.
--   - The engine emits actionable `recommendations` — each proposing one of:
--       simplify, automate, remove, merge, split, delegate
--     together with its expected impact and a confidence score — so the operator
--     sees not just WHAT is wrong but WHICH change to make and how sure we are.
--   - One standing evaluation per workflow: `(tenant_id, workflow_name)` is
--     unique, and each re-evaluation upserts the row in place. Mutable.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0102_workflow_evaluations_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- workflow_evaluations — the Continuous Improvement Engine's standing verdict on
-- one workflow. `metrics` carries per-dimension scores (speed, quality, cost,
-- conversion, reliability, user-effort); `health_score` is the normalized [0,1]
-- roll-up; `recommendations` holds the proposed changes (simplify/automate/
-- remove/merge/split/delegate) with expected impact + confidence. One standing
-- row per workflow, upserted on each re-evaluation. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists workflow_evaluations (
  id               uuid              primary key default gen_random_uuid(),
  tenant_id        uuid              not null,
  workflow_name    text              not null,
  metrics          jsonb             not null default '{}'::jsonb,
  health_score     double precision  not null default 0
                                     check (health_score >= 0 and health_score <= 1),
  recommendations  jsonb             not null default '[]'::jsonb,
  created_at       timestamptz       not null default now(),
  updated_at       timestamptz,
  unique (tenant_id, workflow_name)
);

-- -----------------------------------------------------------------------------
-- updated_at trigger for workflow_evaluations. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_workflow_evaluations on workflow_evaluations;
create trigger set_updated_at_workflow_evaluations
  before update on workflow_evaluations
  for each row execute function set_updated_at();
