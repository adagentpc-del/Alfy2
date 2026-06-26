-- =============================================================================
-- Migration: 0113_money_game_plans.sql
-- Purpose:   Stand up the Alfy² Elite Money Game Engine — a single
--            `money_game_plans` table that stores computed, ranked plans for
--            legally minimizing taxes, protecting assets, building wealth, and
--            investing intelligently. Education and analysis only, for advisor
--            execution. Implements the Elite Money Game on top of the
--            tenant-scoped platform.
--
-- ELITE MONEY GAME MODEL
--   - Each row is a COMPUTED, RANKED PLAN for one subject: the engine assembles
--     the relevant strategies and writes the conclusions out as a dated record
--     (`created_at`).
--   - `strategies` holds the ranked money-game strategies (what it is, when it
--     applies / does not apply, benefits, risks, compliance requirements,
--     advisor needed, complexity, implementation steps).
--   - Core principles are pinned on every plan: `protect_downside_first` and
--     `legal_avoidance_only` are always true (legal tax avoidance only, never
--     evasion; protect downside first).
--   - `risk_level` rates the plan and `disclaimer` carries the standing
--     disclaimer — analysis and education only; CPA/attorney review for
--     execution.
--   - Plans are IMMUTABLE: a row is a recorded computation, not edited in place.
--     There is no updated_at and no trigger — successive plans append new rows
--     rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0114_money_game_plans_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- money_game_plans — a computed, ranked money-game plan for one subject. Holds
-- the ranked strategies (education and analysis only), the pinned principles
-- (protect downside first, legal avoidance only), the risk level, and the
-- standing disclaimer. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists money_game_plans (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  subject                 text              not null,
  strategies              jsonb             not null default '[]'::jsonb,
  protect_downside_first  boolean           not null default true,
  legal_avoidance_only    boolean           not null default true,
  risk_level              text              not null check (risk_level in ('low','medium','high')),
  disclaimer              text              not null,
  created_at              timestamptz       not null default now()
);

create index if not exists money_game_plans_tenant_created_idx
  on money_game_plans (tenant_id, created_at);
