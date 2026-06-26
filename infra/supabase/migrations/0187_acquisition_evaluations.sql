-- =============================================================================
-- Migration: 0187_acquisition_evaluations.sql
-- Purpose:   Stand up the Acquisition Engine — a single `acquisition_evaluations`
--            table that stores, for any opportunity, the per-path verdicts (build /
--            buy / partner / license / white_label / acquire / invest / ignore)
--            scored on time, cost, revenue, risk, leverage, complexity, and
--            strategic value, the single recommended path, and the reason. Teaches
--            Alfy² to think like a capital allocator. Implements ADR-0112-acquisition
--            on the tenant-scoped platform.
--
-- ACQUISITION EVALUATION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME EVALUATION for one opportunity: the
--     engine scores every capture path and writes out the result as a dated record
--     (`created_at`).
--   - `opportunity` is what was evaluated; `verdicts` is the per-strategy scoring
--     array; `recommendation` is the chosen path; `reason` explains it.
--   - Evaluations are APPEND-ONLY: a row is a recorded verdict, not edited in
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every evaluation immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- acquisition_evaluations — a computed point-in-time evaluation for one
-- opportunity. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists acquisition_evaluations (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  opportunity       text              not null,
  verdicts          jsonb             not null default '[]'::jsonb,
  recommendation    text              not null check (recommendation in (
                                        'build', 'buy', 'partner', 'license', 'white_label',
                                        'acquire', 'invest', 'ignore')),
  reason            text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists acquisition_evaluations_tenant_created_idx
  on acquisition_evaluations (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on acquisition_evaluations (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table acquisition_evaluations enable row level security;

-- =============================================================================
-- acquisition_evaluations — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing evaluation immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy acquisition_evaluations_select on acquisition_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy acquisition_evaluations_insert on acquisition_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
