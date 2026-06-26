-- =============================================================================
-- Migration: 0160_leverage_comparisons.sql
-- Purpose:   Stand up the Alfy² Leverage Engine — a single `leverage_comparisons`
--            table that stores each ranked comparison across options, the
--            recommended highest-leverage path, and a note explaining any
--            fastest-vs-highest-leverage trade-off. Implements the Leverage
--            Engine (ADR-0086) on top of the tenant-scoped platform.
--
-- LEVERAGE MODEL
--   - Each row is a COMPUTED ranked comparison across options: the engine scores
--     each option from its fourteen leverage inputs and writes the ranking out as
--     a dated comparison.
--   - `ranked` holds the per-option leverage scores (label, score, tier, top
--     drivers, why) in ranked order; `recommended_option` is the highest-leverage
--     path (not simply the fastest); `note` explains the trade when the fastest
--     option differs from the highest-leverage one.
--   - Comparisons are APPEND-ONLY / IMMUTABLE: a row is a recorded computation,
--     not edited in place. There is no updated_at and no trigger — successive
--     comparisons append new rows rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0161_leverage_comparisons_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- leverage_comparisons — a computed ranked comparison across options, with the
-- recommended highest-leverage option and a note on any fastest-vs-leverage
-- trade. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists leverage_comparisons (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  ranked              jsonb             not null default '[]'::jsonb,
  recommended_option  text              not null,
  note                text              not null default '',
  created_at          timestamptz       not null default now()
);

create index if not exists leverage_comparisons_tenant_created_idx
  on leverage_comparisons (tenant_id, created_at);
