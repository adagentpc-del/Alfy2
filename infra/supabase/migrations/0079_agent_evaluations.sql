-- =============================================================================
-- Migration: 0079_agent_evaluations.sql
-- Purpose:   Stand up the Alfy² Agent Evaluation Lab — a single
--            `agent_evaluations` table that tracks how each agent is tested and
--            scored before it is trusted with real work. Implements the
--            Evaluation Lab on top of the tenant-scoped platform.
--
-- AGENT EVALUATION LAB MODEL
--   - Every agent is put through an evaluation BEFORE it is allowed to act: it is
--     given test tasks (expected outputs, failure cases, and risk checks) stored
--     in `test_cases`, and scored on accuracy / usefulness / cost / speed /
--     reliability in `scores`.
--   - An agent passes when it clears the `pass_threshold` (0..1); `passed`
--     records the outcome of the most recent evaluation.
--   - Agents are promoted through a STAGE lifecycle as they earn trust:
--       draft → testing → limited_use → approved → production → retired.
--   - GUARDRAIL: agents get NO broad permissions until they pass evaluation.
--     `broad_permissions_allowed` stays false until an agent has demonstrably
--     passed, gating elevated access behind a real, scored evaluation.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in
-- 0080_agent_evaluations_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- agent_evaluations — one evaluation record per agent: the test cases it was run
-- against, the scores it earned (accuracy/usefulness/cost/speed/reliability),
-- whether it passed its threshold, and which stage of the trust lifecycle it
-- sits in. Broad permissions stay gated until the agent passes. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists agent_evaluations (
  id                         uuid              primary key default gen_random_uuid(),
  tenant_id                  uuid              not null,
  agent_key                  text              not null,
  stage                      text              not null default 'draft'
                                               check (stage in (
                                                 'draft','testing','limited_use',
                                                 'approved','production','retired')),
  test_cases                 jsonb             not null default '[]'::jsonb,
  scores                     jsonb,
  passed                     boolean           not null default false,
  pass_threshold             double precision  not null default 0.8
                                               check (pass_threshold >= 0 and pass_threshold <= 1),
  broad_permissions_allowed  boolean           not null default false,
  notes                      text              not null default '',
  created_at                 timestamptz       not null default now(),
  updated_at                 timestamptz,
  unique (tenant_id, agent_key)
);

create index if not exists agent_evaluations_tenant_stage_idx
  on agent_evaluations (tenant_id, stage);

-- -----------------------------------------------------------------------------
-- updated_at trigger for agent_evaluations. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_agent_evaluations on agent_evaluations;
create trigger set_updated_at_agent_evaluations
  before update on agent_evaluations
  for each row execute function set_updated_at();
