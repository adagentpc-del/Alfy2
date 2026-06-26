-- =============================================================================
-- Migration: 0182_exit_assessments.sql
-- Purpose:   Stand up the Strategic Exit & Asset Value Engine — a single
--            `exit_assessments` table that stores, for an asset, the recommended
--            exit paths, potential buyers, valuation logic, revenue multiple,
--            estimated value, strategic value, what proof/documentation is
--            missing, the steps to make it sellable, and how ready it is to sell
--            today. Implements ADR-0105-strategic-exit on the tenant-scoped
--            platform.
--
-- EXIT ASSESSMENT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME ASSESSMENT for one asset: the engine
--     scores it and writes out the assessment as a dated record (`created_at`).
--   - `recommended_paths` are the exit-path options; `potential_buyers`,
--     `missing_proof`, `missing_documentation`, and `steps_to_sellable` are lists;
--     `revenue_multiple` / `estimated_value_usd` / `strategic_value` /
--     `sellability` are numeric.
--   - Assessments are APPEND-ONLY: a row is a recorded valuation, not edited in
--     place. There is no updated_at and no trigger — re-assessing appends a row.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every assessment immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- exit_assessments — a computed point-in-time exit/value assessment for one
-- asset. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists exit_assessments (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  asset_name              text              not null,
  recommended_paths       jsonb             not null default '[]'::jsonb,
  potential_buyers        jsonb             not null default '[]'::jsonb,
  valuation_logic         text              not null,
  revenue_multiple        numeric           not null check (revenue_multiple >= 0),
  estimated_value_usd     numeric           not null check (estimated_value_usd >= 0),
  strategic_value         numeric           not null check (strategic_value >= 0 and strategic_value <= 1),
  missing_proof           jsonb             not null default '[]'::jsonb,
  missing_documentation   jsonb             not null default '[]'::jsonb,
  steps_to_sellable       jsonb             not null default '[]'::jsonb,
  sellability             numeric           not null check (sellability >= 0 and sellability <= 1),
  created_at              timestamptz       not null default now()
);

create index if not exists exit_assessments_tenant_created_idx
  on exit_assessments (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on exit_assessments (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table exit_assessments enable row level security;

-- =============================================================================
-- exit_assessments — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing assessment immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy exit_assessments_select on exit_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy exit_assessments_insert on exit_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
