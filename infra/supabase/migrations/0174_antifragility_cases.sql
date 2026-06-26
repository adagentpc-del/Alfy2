-- =============================================================================
-- Migration: 0174_antifragility_cases.sql
-- Purpose:   Stand up the Anti-Fragility Engine — a single `antifragility_cases`
--            table that stores the anti-fragile response to a failure: root
--            cause, whether it was preventable, the reusable lesson, and the new
--            safeguard / automation / agent / SOP / system redesign it implies,
--            plus recovery speed, learning gained, and future risk reduction.
--            Implements ADR-0095-anti-fragility on the tenant-scoped platform.
--
-- ANTI-FRAGILITY CASE MODEL
--   - Each row is a COMPUTED POINT-IN-TIME CASE for one failure: the engine
--     analyzes it and writes out the response as a dated case (`created_at`).
--   - `recovery_days` is the time from failure to recovery; `learning_gained` and
--     `future_risk_reduction` are 0..1 scores.
--   - Cases are APPEND-ONLY: a row is a recorded analysis, not edited in place.
--     There is no updated_at and no trigger — re-analysis appends a new case.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every case immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- antifragility_cases — a computed point-in-time anti-fragile response to one
-- failure. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists antifragility_cases (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  type                    text              not null check (type in (
                                              'missed_opportunity', 'failed_launch', 'security_incident',
                                              'rejected_proposal', 'lost_sale', 'customer_complaint',
                                              'agent_failure', 'workflow_breakdown', 'model_error')),
  title                   text              not null,
  root_cause              text              not null default '',
  preventable             boolean           not null,
  reusable_lesson         text              not null default '',
  new_safeguard           text              not null default '',
  new_automation          text              not null default '',
  new_agent               text              not null default '',
  new_sop                 text              not null default '',
  system_redesign         text              not null default '',
  recovery_days           integer           not null check (recovery_days >= 0),
  learning_gained         numeric           not null check (learning_gained >= 0 and learning_gained <= 1),
  future_risk_reduction   numeric           not null check (future_risk_reduction >= 0 and future_risk_reduction <= 1),
  created_at              timestamptz       not null default now()
);

create index if not exists antifragility_cases_tenant_created_idx
  on antifragility_cases (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on antifragility_cases (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table antifragility_cases enable row level security;

-- =============================================================================
-- antifragility_cases — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing case immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy antifragility_cases_select on antifragility_cases
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy antifragility_cases_insert on antifragility_cases
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
