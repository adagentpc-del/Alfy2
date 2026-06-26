-- =============================================================================
-- Migration: 0105_finance_overviews.sql
-- Purpose:   Stand up the Alfy² Finance Command Center — a single
--            `finance_overviews` table that stores computed, point-in-time
--            snapshots of personal and business finances: total revenue,
--            expenses, net cash flow, tax exposure, per-business breakdowns,
--            personal net worth, and the headline. Implements Finance Command
--            on top of the tenant-scoped platform.
--
-- FINANCE COMMAND MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SNAPSHOT of the operator's complete
--     finance surface: the engine analyzes income, expenses, cash flow, taxes,
--     and per-business finances and writes the conclusions out as a dated
--     snapshot (`generated_at`).
--   - `businesses` holds the per-business finance reports (revenue, expenses,
--     profit, margin, tax exposure, runway, best next action, risks,
--     opportunities) the engine produced for this snapshot.
--   - Alfy² analyzes aggressively but NEVER moves or spends money without
--     approval: `money_actions_require_approval` is always true.
--   - Snapshots are IMMUTABLE: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new snapshots rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0106_finance_overviews_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- finance_overviews — a computed point-in-time snapshot of the operator's
-- complete finance picture: total monthly revenue/expenses, net cash flow,
-- total tax exposure, per-business reports, personal net worth and monthly net,
-- and the headline. Money actions always require approval. Immutable (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists finance_overviews (
  id                          uuid              primary key default gen_random_uuid(),
  tenant_id                   uuid              not null,
  total_monthly_revenue_usd   double precision  not null default 0,
  total_monthly_expenses_usd  double precision  not null default 0,
  net_cash_flow_usd           double precision  not null default 0,
  total_tax_exposure_usd      double precision  not null default 0,
  businesses                  jsonb             not null default '[]'::jsonb,
  personal_net_worth_usd      double precision  not null default 0,
  personal_monthly_net_usd    double precision  not null default 0,
  headline                    text              not null,
  money_actions_require_approval  boolean       not null default true,
  generated_at                timestamptz       not null default now(),
  created_at                  timestamptz       not null default now()
);

create index if not exists finance_overviews_tenant_generated_idx
  on finance_overviews (tenant_id, generated_at);
