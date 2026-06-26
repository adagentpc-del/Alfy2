-- =============================================================================
-- Migration: 0185_capital_reports.sql
-- Purpose:   Stand up the Capital Engine — a single `capital_reports` table that
--            stores, for a recommendation, how much of each of the ten forms of
--            capital increases or decreases (the deltas), the net capital change,
--            the compounding effect, the payoff horizon, and the plausible
--            conversion paths between capital forms. Optimizes for lifetime
--            capital accumulation rather than short-term activity. Implements
--            ADR-0108-capital-engine on the tenant-scoped platform.
--
-- CAPITAL REPORT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REPORT for one recommendation: the
--     engine scores the capital impact and writes it out as a dated record
--     (`created_at`).
--   - `deltas` holds the per-capital changes (-1..1); `increases` / `decreases`
--     list the capital types that grow / deplete; `net_capital` is the -1..1 net
--     change; `compounding` is 0..1; `payoff_months` is the horizon;
--     `conversion_paths` are the plausible capital-to-capital conversions.
--   - Reports are APPEND-ONLY: a row is a recorded analysis, not edited in place.
--     There is no updated_at and no trigger — re-running appends a new report.
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
-- capital_reports — a computed point-in-time capital growth report for one
-- recommendation. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists capital_reports (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  recommendation    text              not null,
  deltas            jsonb             not null default '{}'::jsonb,
  increases         jsonb             not null default '[]'::jsonb,
  decreases         jsonb             not null default '[]'::jsonb,
  net_capital       numeric           not null check (net_capital >= -1 and net_capital <= 1),
  compounding       numeric           not null check (compounding >= 0 and compounding <= 1),
  payoff_months     numeric           not null check (payoff_months >= 0),
  conversion_paths  jsonb             not null default '[]'::jsonb,
  created_at        timestamptz       not null default now()
);

create index if not exists capital_reports_tenant_created_idx
  on capital_reports (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on capital_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table capital_reports enable row level security;

-- =============================================================================
-- capital_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy capital_reports_select on capital_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy capital_reports_insert on capital_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
