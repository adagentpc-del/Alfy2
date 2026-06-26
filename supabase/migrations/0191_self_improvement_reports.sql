-- =============================================================================
-- Migration: 0191_self_improvement_reports.sql
-- Purpose:   Stand up the Enterprise Self-Improvement Engine — a single
--            `self_improvement_reports` table that stores each period's
--            evaluation of the operating system itself: the findings (what is
--            slow, duplicated, fragile, confusing, or should be simplified,
--            merged, retired, or promoted), the refactoring plan, the tech-debt
--            report, and the net complexity delta the plan implies. The goal:
--            Alfy² improves continuously without becoming more complicated.
--            Implements ADR-0117-self-improvement on the tenant-scoped platform.
--
-- SELF-IMPROVEMENT REPORT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REPORT for one period: the engine
--     evaluates the system and writes out the result as a dated record
--     (`created_at`).
--   - `period_label` names the period; `findings`, `refactoring_plan`, and
--     `tech_debt` are jsonb arrays; `complexity_delta` is the net change the plan
--     implies (negative-leaning = simpler).
--   - Reports are APPEND-ONLY: a row is a recorded evaluation, not edited in
--     place. There is no updated_at and no trigger — re-evaluating appends a row.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every report immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- self_improvement_reports — a computed point-in-time report for one period.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists self_improvement_reports (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  period_label        text              not null,
  findings            jsonb             not null default '[]'::jsonb,
  refactoring_plan    jsonb             not null default '[]'::jsonb,
  tech_debt           jsonb             not null default '[]'::jsonb,
  complexity_delta    numeric           not null check (complexity_delta >= -1 and complexity_delta <= 1),
  created_at          timestamptz       not null default now()
);

create index if not exists self_improvement_reports_tenant_created_idx
  on self_improvement_reports (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on self_improvement_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table self_improvement_reports enable row level security;

-- =============================================================================
-- self_improvement_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy self_improvement_reports_select on self_improvement_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy self_improvement_reports_insert on self_improvement_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
