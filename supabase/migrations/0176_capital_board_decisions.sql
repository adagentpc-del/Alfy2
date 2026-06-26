-- =============================================================================
-- Migration: 0176_capital_board_decisions.sql
-- Purpose:   Stand up the Capital Allocation Board — a single
--            `capital_board_decisions` table that stores the board's allocation
--            of cash, time, attention, energy, team/agent capacity, technology
--            spend, relationships, and brand equity: for every option it records
--            the scored verdict and disposition (invest / test / delay / automate
--            / delegate / kill / sell / package_founderos) and names the top pick.
--            Implements ADR-0099-capital-board on the tenant-scoped platform.
--
-- CAPITAL BOARD DECISION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME DECISION for one allocation run: the
--     board scores the options and writes out the result as a dated decision
--     (`created_at`).
--   - `verdicts` holds the per-option scores, opportunity cost, disposition, and
--     reason; `top_pick` is the recommended option label.
--   - Decisions are APPEND-ONLY: a row is a recorded allocation, not edited in
--     place. There is no updated_at and no trigger — re-running appends a new row.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every decision immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- capital_board_decisions — a computed point-in-time allocation decision.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists capital_board_decisions (
  id            uuid              primary key default gen_random_uuid(),
  tenant_id     uuid              not null,
  verdicts      jsonb             not null default '[]'::jsonb,
  top_pick      text              not null,
  created_at    timestamptz       not null default now()
);

create index if not exists capital_board_decisions_tenant_created_idx
  on capital_board_decisions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on capital_board_decisions (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table capital_board_decisions enable row level security;

-- =============================================================================
-- capital_board_decisions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing decision immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy capital_board_decisions_select on capital_board_decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy capital_board_decisions_insert on capital_board_decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
