-- =============================================================================
-- Migration: 0178_revenue_truth_reports.sql
-- Purpose:   Stand up the Revenue Truth System — a single `revenue_truth_reports`
--            table that stores an honest, real-money-first revenue snapshot for a
--            business: cash collected, signed, invoices sent, qualified pipeline,
--            booked calls, the probability-weighted pipeline, the stalled deals,
--            and the single next money action. Prevents fake progress by never
--            treating activity as revenue. Implements ADR-0101-revenue-truth on
--            the tenant-scoped platform.
--
-- REVENUE TRUTH REPORT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REPORT for one business: the system
--     rolls up the deals and writes out the truth report as a dated record
--     (`created_at`).
--   - The *_usd fields are real-money-first rungs of the ladder; `booked_calls`
--     is an integer; `stalled_deals` lists deals idle past the threshold;
--     `next_money_action` is the single highest-leverage next step.
--   - Reports are APPEND-ONLY: a row is a recorded snapshot, not edited in place.
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
-- revenue_truth_reports — a computed point-in-time, real-money-first revenue
-- report for one business. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists revenue_truth_reports (
  id                                    uuid              primary key default gen_random_uuid(),
  tenant_id                             uuid              not null,
  business_name                         text              not null,
  cash_collected_usd                    numeric           not null check (cash_collected_usd >= 0),
  signed_usd                            numeric           not null check (signed_usd >= 0),
  invoices_sent_usd                     numeric           not null check (invoices_sent_usd >= 0),
  qualified_pipeline_usd                numeric           not null check (qualified_pipeline_usd >= 0),
  booked_calls                          integer           not null check (booked_calls >= 0),
  probability_weighted_pipeline_usd     numeric           not null check (probability_weighted_pipeline_usd >= 0),
  stalled_deals                         jsonb             not null default '[]'::jsonb,
  next_money_action                     text              not null,
  created_at                            timestamptz       not null default now()
);

create index if not exists revenue_truth_reports_tenant_created_idx
  on revenue_truth_reports (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on revenue_truth_reports (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table revenue_truth_reports enable row level security;

-- =============================================================================
-- revenue_truth_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy revenue_truth_reports_select on revenue_truth_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy revenue_truth_reports_insert on revenue_truth_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
