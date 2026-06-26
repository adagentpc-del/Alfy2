-- =============================================================================
-- Migration: 0081_workflow_cost_reports.sql
-- Purpose:   Stand up the Alfy² Cost & Token CFO — a single
--            `workflow_cost_reports` table that stores per-workflow cost
--            decomposition and ROI analysis. Implements the Cost CFO on top of
--            the tenant-scoped platform.
--
-- COST & TOKEN CFO MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SNAPSHOT for one workflow: the engine
--     decomposes the workflow's spend (total_cost_usd) against the value it
--     produced (value_usd) and writes the conclusions out as a dated snapshot
--     (`generated_at`).
--   - The snapshot breaks cost down to PER-UNIT economics —
--     cost_per_task, cost_per_lead, cost_per_booked_call, cost_per_sale — and
--     frames it against `roi` and `break_even_revenue_usd`.
--   - `largest_cost_category` names where the money goes (model / api /
--     automation / tool_subscription / compute / storage), and the engine emits
--     `recommendations` (cheaper model, better workflow, pause, batch, local,
--     upgrade) with a written `rationale`.
--   - Snapshots are IMMUTABLE / APPEND-ONLY: a row is a recorded computation, not
--     edited in place. There is no updated_at and no trigger — successive
--     computations append new snapshots rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0082_workflow_cost_reports_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- workflow_cost_reports — a computed point-in-time cost snapshot for one
-- workflow. Holds total cost vs value, per-unit costs (task/lead/booked
-- call/sale), ROI, break-even, the largest cost category, and the engine's
-- recommendations + rationale. Immutable (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists workflow_cost_reports (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  workflow_name            text              not null,
  business_id              uuid,
  total_cost_usd           double precision  not null default 0,
  value_usd                double precision  not null default 0,
  cost_per_task            double precision,
  cost_per_lead            double precision,
  cost_per_booked_call     double precision,
  cost_per_sale            double precision,
  roi                      double precision,
  break_even_revenue_usd   double precision  not null default 0,
  largest_cost_category    text              check (largest_cost_category in (
                                               'model','api','automation',
                                               'tool_subscription','compute','storage')),
  recommendations          jsonb             not null default '[]'::jsonb,
  rationale                text              not null default '',
  generated_at             timestamptz       not null default now()
);

create index if not exists workflow_cost_reports_tenant_workflow_idx
  on workflow_cost_reports (tenant_id, workflow_name);
