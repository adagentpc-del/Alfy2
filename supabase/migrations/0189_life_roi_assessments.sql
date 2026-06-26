-- =============================================================================
-- Migration: 0189_life_roi_assessments.sql
-- Purpose:   Stand up the Life ROI Engine — a single `life_roi_assessments`
--            table that stores, for each workflow, both Financial ROI and Life
--            ROI: hours saved per year, workdays returned, financial ROI ratio,
--            decisions/meetings/emails eliminated, freedom gained, the composite
--            Life ROI score, and a summary. Alfy² optimizes for life returned,
--            not only money earned. Implements ADR-0115-life-roi on the
--            tenant-scoped platform.
--
-- LIFE ROI ASSESSMENT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME ASSESSMENT for one workflow: the
--     engine computes the dual ROI and writes out the result as a dated record
--     (`created_at`).
--   - `workflow` is what was assessed; the numeric columns capture time/financial
--     return and the 0..1 freedom and composite Life ROI scores; `summary`
--     explains it.
--   - Assessments are APPEND-ONLY: a row is a recorded calculation, not edited in
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
-- life_roi_assessments — a computed point-in-time assessment for one workflow.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists life_roi_assessments (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  workflow                text              not null,
  hours_saved_per_year    numeric           not null check (hours_saved_per_year >= 0),
  workdays_returned       numeric           not null check (workdays_returned >= 0),
  financial_roi           numeric           not null,
  decisions_eliminated    integer           not null check (decisions_eliminated >= 0),
  meetings_eliminated     integer           not null check (meetings_eliminated >= 0),
  emails_eliminated       integer           not null check (emails_eliminated >= 0),
  freedom_gained          numeric           not null check (freedom_gained >= 0 and freedom_gained <= 1),
  life_roi_score          numeric           not null check (life_roi_score >= 0 and life_roi_score <= 1),
  summary                 text              not null,
  created_at              timestamptz       not null default now()
);

create index if not exists life_roi_assessments_tenant_created_idx
  on life_roi_assessments (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on life_roi_assessments (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table life_roi_assessments enable row level security;

-- =============================================================================
-- life_roi_assessments — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing assessment immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy life_roi_assessments_select on life_roi_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy life_roi_assessments_insert on life_roi_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
