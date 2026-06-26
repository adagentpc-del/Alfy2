-- =============================================================================
-- Migration: 0097_twin_snapshots.sql
-- Purpose:   Stand up the Alfy² Digital Twin — a single `twin_snapshots` table
--            that stores continuously-updated, point-in-time models of the
--            enterprise. Implements the Digital Twin on top of the tenant-scoped
--            platform.
--
-- DIGITAL TWIN MODEL
--   - The Digital Twin is a continuously-updated model of the entire enterprise:
--     businesses, finances, assets, contacts, projects, agents, workflows,
--     campaigns, goals, and risks. The full modeled state is captured in
--     `state`.
--   - The twin supports WHAT-IF SIMULATIONS — the operator forecasts off the
--     modeled state, and `runway_months` carries the headline forecast metric
--     (nullable until computed).
--   - Each row is a COMPUTED POINT-IN-TIME SNAPSHOT (`captured_at`). Snapshots
--     are APPEND-ONLY: successive captures append new snapshots rather than
--     mutating old ones, giving a history to forecast against. There is no
--     updated_at and no trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0098_twin_snapshots_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- twin_snapshots — a continuously-updated, point-in-time model of the enterprise
-- (businesses/finances/assets/contacts/projects/agents/workflows/campaigns/
-- goals/risks) captured in `state`, supporting what-if simulations and runway
-- forecasting. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists twin_snapshots (
  id             uuid              primary key default gen_random_uuid(),
  tenant_id      uuid              not null,
  state          jsonb             not null default '{}'::jsonb,
  runway_months  double precision,
  captured_at    timestamptz       not null default now()
);

create index if not exists twin_snapshots_tenant_captured_idx
  on twin_snapshots (tenant_id, captured_at);
