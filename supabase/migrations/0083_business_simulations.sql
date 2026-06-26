-- =============================================================================
-- Migration: 0083_business_simulations.sql
-- Purpose:   Stand up the Alfy² Business Simulation Engine — a single
--            `business_simulations` table that stores A-vs-B decision
--            comparisons for the operator. Implements the Simulation Engine on
--            top of the tenant-scoped platform.
--
-- BUSINESS SIMULATION ENGINE MODEL
--   - Each row is a COMPUTED POINT-IN-TIME comparison of two options for one
--     decision. Six decision KINDS span the operator's strategy surface:
--       focus_choice, campaign_choice, hire_vs_automate, pricing_choice,
--       lead_focus, build_vs_sell.
--   - The engine frames the decision as a `question`, then projects each option
--     (`option_a`, `option_b`) to best / likely / worst outcomes across revenue,
--     risk, time, and stress.
--   - It then RECOMMENDS one option (`recommendation`) with a written `reason`.
--   - Snapshots are IMMUTABLE / APPEND-ONLY: a row is a recorded computation, not
--     edited in place. There is no updated_at and no trigger — re-running a
--     simulation appends a new comparison rather than mutating an old one.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0084_business_simulations_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- business_simulations — a computed A-vs-B decision comparison. Carries the
-- decision kind, the framing question, the two options (each projected to
-- best/likely/worst on revenue/risk/time/stress), and the engine's
-- recommendation + reason. Immutable (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists business_simulations (
  id              uuid              primary key default gen_random_uuid(),
  tenant_id       uuid              not null,
  kind            text              not null
                                    check (kind in (
                                      'focus_choice','campaign_choice','hire_vs_automate',
                                      'pricing_choice','lead_focus','build_vs_sell')),
  question        text              not null default '',
  option_a        jsonb             not null default '{}'::jsonb,
  option_b        jsonb             not null default '{}'::jsonb,
  recommendation  text              not null,
  reason          text              not null,
  created_at      timestamptz       not null default now()
);

create index if not exists business_simulations_tenant_kind_idx
  on business_simulations (tenant_id, kind);
