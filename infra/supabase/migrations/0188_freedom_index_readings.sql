-- =============================================================================
-- Migration: 0188_freedom_index_readings.sql
-- Purpose:   Stand up the Founder Freedom Index — a single
--            `freedom_index_readings` table that stores each period's freedom
--            score (0–100), the trend (increasing / flat / decreasing), the
--            biggest bottleneck, and a recommendation. Measures whether Alfy²
--            is removing time, decision load, and stress while preserving revenue
--            and returning life. Implements ADR-0114-freedom-index on the
--            tenant-scoped platform.
--
-- FREEDOM INDEX READING MODEL
--   - Each row is a COMPUTED POINT-IN-TIME READING for one period: the engine
--     scores the inputs and writes out the result as a dated record
--     (`created_at`).
--   - `period_label` names the period; `score` is the 0–100 freedom score;
--     `trend` is the direction versus the prior reading; `biggest_bottleneck`
--     and `recommendation` direct the next improvement.
--   - Readings are APPEND-ONLY: a row is a recorded measurement, not edited in
--     place. There is no updated_at and no trigger — re-measuring appends a row.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every reading immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- freedom_index_readings — a computed point-in-time reading for one period.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists freedom_index_readings (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  period_label        text              not null,
  score               numeric           not null check (score >= 0 and score <= 100),
  trend               text              not null check (trend in (
                                          'increasing', 'flat', 'decreasing')),
  biggest_bottleneck  text              not null,
  recommendation      text              not null,
  created_at          timestamptz       not null default now()
);

create index if not exists freedom_index_readings_tenant_created_idx
  on freedom_index_readings (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on freedom_index_readings (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table freedom_index_readings enable row level security;

-- =============================================================================
-- freedom_index_readings — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing reading immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy freedom_index_readings_select on freedom_index_readings
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy freedom_index_readings_insert on freedom_index_readings
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
