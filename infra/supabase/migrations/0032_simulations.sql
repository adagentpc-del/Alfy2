-- =============================================================================
-- Migration: 0032_simulations.sql
-- Purpose:   Stand up the Alfy² Simulation Engine — a single `simulations` table
--            that stores the outcome of a simulation run. Implements the
--            Simulation Engine on top of the tenant-scoped platform.
--
-- SIMULATION ENGINE MODEL
--   Before launching major workflows, the engine simulates outcomes and stores
--   the result: a best / likely / worst case, the risks it surfaced, a
--   recommendation, and the decision the operator now needs to make.
--   - Eight simulation kinds span the operator's decision surface:
--       campaign_outcome, revenue_path, hiring_vs_automation, pricing_change,
--       priority_shift, cash_flow, implementation_risk, agent_failure.
--   - Each run projects over a `horizon_days` window and records three scenarios
--     (best_case, likely_case, worst_case) plus an optional `expected_value`.
--   - `risks` holds the surfaced risk set; `recommendation` and `decision_needed`
--     carry the engine's call to action.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0033_simulations_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- simulations — a stored simulation result. Before launching a major workflow,
-- the engine simulates outcomes over a horizon and stores the best / likely /
-- worst case, the surfaced risks, an expected value, a recommendation, and the
-- decision the operator now needs to make. One of eight kinds. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists simulations (
  id               uuid             primary key default gen_random_uuid(),
  tenant_id        uuid             not null,
  kind             text             not null
                                    check (kind in (
                                      'campaign_outcome','revenue_path','hiring_vs_automation',
                                      'pricing_change','priority_shift','cash_flow',
                                      'implementation_risk','agent_failure')),
  name             text             not null,
  horizon_days     integer          not null default 90 check (horizon_days > 0),
  best_case        jsonb            not null default '{}'::jsonb,
  likely_case      jsonb            not null default '{}'::jsonb,
  worst_case       jsonb            not null default '{}'::jsonb,
  expected_value   double precision,
  risks            jsonb            not null default '[]'::jsonb,
  recommendation   text             not null default '',
  decision_needed  text             not null default '',
  created_at       timestamptz      not null default now(),
  updated_at       timestamptz
);

create index if not exists simulations_tenant_kind_idx
  on simulations (tenant_id, kind);

create index if not exists simulations_tenant_created_idx
  on simulations (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for simulations. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_simulations on simulations;
create trigger set_updated_at_simulations
  before update on simulations
  for each row execute function set_updated_at();
