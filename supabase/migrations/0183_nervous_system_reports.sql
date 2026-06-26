-- =============================================================================
-- Migration: 0183_nervous_system_reports.sql
-- Purpose:   Stand up Founder Nervous System Protection — a single
--            `nervous_system_reports` table that stores a load reading: the
--            overall load index, the status (ok / elevated / high / critical), the
--            delegate/delay/batch/automate/cancel/simplify/escalate/convert
--            recommendations, and whether burnout risk is flagged as an enterprise
--            risk. Implements ADR-0106-nervous-system on the tenant-scoped
--            platform.
--
-- NERVOUS SYSTEM REPORT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME READING: the engine evaluates load and
--     writes out the report as a dated record (`created_at`).
--   - `load_index` is the 0..1 overall load; `status` is the band;
--     `recommendations` holds the per-target actions; `burnout_risk_flagged` is
--     true when load is high enough to register as an enterprise risk.
--   - Reports are APPEND-ONLY: a row is a recorded reading, not edited in place.
--     There is no updated_at and no trigger — each reading appends a report.
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
-- nervous_system_reports — a computed point-in-time nervous-system reading.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists nervous_system_reports (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  load_index            numeric           not null check (load_index >= 0 and load_index <= 1),
  status                text              not null check (status in ('ok', 'elevated', 'high', 'critical')),
  recommendations       jsonb             not null default '[]'::jsonb,
  burnout_risk_flagged  boolean           not null,
  created_at            timestamptz       not null default now()
);

create index if not exists nervous_system_reports_tenant_created_idx
  on nervous_system_reports (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on nervous_system_reports (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table nervous_system_reports enable row level security;

-- =============================================================================
-- nervous_system_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy nervous_system_reports_select on nervous_system_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy nervous_system_reports_insert on nervous_system_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
