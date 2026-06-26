-- =============================================================================
-- Migration: 0184_progress_assessments.sql
-- Purpose:   Stand up the True Progress Engine (outcome engines) — a single
--            `progress_assessments` table that classifies an initiative by what it
--            actually creates (real vs fake progress, maintenance, distraction,
--            risk/revenue/leverage/freedom creation), scores its real outcome
--            value, and recommends an action (keep / delegate / automate / pause /
--            delete / simplify / convert_to_ip / move_to_later / assign_to_agent).
--            It must never confuse intensity with progress. Implements
--            ADR-0107-outcome-engines on the tenant-scoped platform.
--
--            NOTE: the Relaxation Outcome plans, capital reports, consequence
--            projections, and pyramid placements are READ-MODELS and get no
--            tables; only True Progress assessments are persisted here.
--
-- PROGRESS ASSESSMENT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME ASSESSMENT for one initiative: the
--     engine classifies it and writes out the result as a dated record
--     (`created_at`).
--   - `kind` is the classification; `outcome_score` is the 0..1 real outcome
--     value; `recommended_action` is the disposition; `reason` explains it.
--   - Assessments are APPEND-ONLY: a row is a recorded classification, not edited
--     in place. There is no updated_at and no trigger — re-assessing appends a row.
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
-- progress_assessments — a computed point-in-time True Progress classification
-- for one initiative. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists progress_assessments (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  initiative          text              not null,
  kind                text              not null check (kind in (
                                          'real_progress', 'fake_progress', 'maintenance', 'distraction',
                                          'risk_reduction', 'revenue_creation', 'leverage_creation',
                                          'freedom_creation')),
  outcome_score       numeric           not null check (outcome_score >= 0 and outcome_score <= 1),
  recommended_action  text              not null check (recommended_action in (
                                          'keep', 'delegate', 'automate', 'pause', 'delete', 'simplify',
                                          'convert_to_ip', 'move_to_later', 'assign_to_agent')),
  reason              text              not null,
  created_at          timestamptz       not null default now()
);

create index if not exists progress_assessments_tenant_created_idx
  on progress_assessments (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on progress_assessments (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table progress_assessments enable row level security;

-- =============================================================================
-- progress_assessments — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing assessment immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy progress_assessments_select on progress_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy progress_assessments_insert on progress_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
