-- =============================================================================
-- Migration: 0030_agent_actions.sql
-- Purpose:   Agent Observability — an APPEND-ONLY provenance log of every agent
--            action so Alfy² can answer what an agent did, why, what data it
--            used, and what changed afterward. Each row is one immutable record
--            of a single agent action: its task, inputs, tools and memory used,
--            decision and rationale, approval status, cost/runtime, outcome,
--            errors, downstream effects, value, and risk.
--
-- HARD GUARANTEE
--   - agent_actions is APPEND-ONLY. It has no updated_at and no trigger, and
--     0031 grants it INSERT + SELECT only — the deliberate absence of
--     UPDATE/DELETE policies (under deny-by-default) makes every action row
--     immutable, exactly like `security_audit` (0018/0019) and `events`/
--     `audit_log` (0001/0002).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables — intentionally absent here.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0031_agent_actions_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- agent_actions — APPEND-ONLY provenance log of every agent action. One
-- immutable record per action with full provenance: the task and input, the
-- tools and memory it used, the decision and rationale, whether approval was
-- required and how it resolved, cost/runtime, the outcome, any errors, the
-- downstream effects it caused, the value it produced, and its risk level.
-- No updated_at: action rows are immutable (enforced in 0031).
-- -----------------------------------------------------------------------------
create table if not exists agent_actions (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  agent_name          text              not null,
  task                text              not null,
  input               text              not null default '',
  tools_used          jsonb             not null default '[]'::jsonb,
  memory_used         jsonb             not null default '[]'::jsonb,
  decision            text              not null default '',
  rationale           text              not null default '',
  approval_status     text              not null default 'not_required'
                                        check (approval_status in (
                                          'not_required','auto_approved','approved','pending','rejected')),
  cost_usd            double precision  not null default 0,
  runtime_ms          integer           not null default 0,
  outcome             text              not null
                                        check (outcome in (
                                          'success','partial','failure','skipped','blocked')),
  errors              jsonb             not null default '[]'::jsonb,
  downstream_effects  jsonb             not null default '[]'::jsonb,
  value_usd           double precision  not null default 0,
  risk_level          text              not null default 'low'
                                        check (risk_level in ('low','medium','high')),
  at                  timestamptz       not null default now(),
  created_at          timestamptz       not null default now()
);

create index if not exists agent_actions_tenant_agent_name_idx
  on agent_actions (tenant_id, agent_name);

create index if not exists agent_actions_tenant_outcome_idx
  on agent_actions (tenant_id, outcome);

create index if not exists agent_actions_tenant_at_idx
  on agent_actions (tenant_id, at);

create index if not exists agent_actions_tenant_approval_status_idx
  on agent_actions (tenant_id, approval_status);
