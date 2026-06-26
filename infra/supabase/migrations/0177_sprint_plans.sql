-- =============================================================================
-- Migration: 0177_sprint_plans.sql
-- Purpose:   Stand up the Million-Dollar Sprint Engine — a single `sprint_plans`
--            table that stores an aggressive-but-realistic path to a cash target:
--            ranked cash paths with their expected cash, the 7/30/90-day plans,
--            the daily money actions, and whether the probability-weighted total
--            is realistic (no fantasy math). Implements ADR-0100-million-sprint on
--            the tenant-scoped platform.
--
-- SPRINT PLAN MODEL
--   - Each row is a COMPUTED POINT-IN-TIME PLAN for one sprint: the engine ranks
--     the paths and writes out the plan as a dated record (`created_at`).
--   - `ranked_paths` holds each path's expected cash, velocity, score,
--     assumptions, risks, and required actions; `plan_7_day` / `plan_30_day` /
--     `plan_90_day` and `daily_money_actions` are the action lists; `realistic`
--     flags when the probability-weighted total clears the target.
--   - Plans are APPEND-ONLY: a row is a recorded plan, not edited in place. There
--     is no updated_at and no trigger — re-running appends a new plan.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every plan immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sprint_plans — a computed point-in-time sprint plan toward a cash target.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists sprint_plans (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  target_usd                numeric           not null check (target_usd > 0),
  ranked_paths              jsonb             not null default '[]'::jsonb,
  expected_total_cash_usd   numeric           not null check (expected_total_cash_usd >= 0),
  plan_7_day                jsonb             not null default '[]'::jsonb,
  plan_30_day               jsonb             not null default '[]'::jsonb,
  plan_90_day               jsonb             not null default '[]'::jsonb,
  daily_money_actions       jsonb             not null default '[]'::jsonb,
  realistic                 boolean           not null,
  created_at                timestamptz       not null default now()
);

create index if not exists sprint_plans_tenant_created_idx
  on sprint_plans (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on sprint_plans (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table sprint_plans enable row level security;

-- =============================================================================
-- sprint_plans — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing plan immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy sprint_plans_select on sprint_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sprint_plans_insert on sprint_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
