-- =============================================================================
-- Migration: 0103_venture_blueprints.sql
-- Purpose:   Stand up the Alfy² Builder Mode feature — a single
--            `venture_blueprints` table that captures the operating system the
--            engine designs for a brand-new venture.
--
-- BUILDER MODE
--   - An operator saying "I want to build…" launches Builder Mode, which spins
--     up an 18-stage venture OPERATING SYSTEM — from discovery through staged
--     review checkpoints — not merely a flat task list. The full stage graph
--     (each stage's plan, outputs, and review gate) lives on `stages`.
--   - HUMAN-IN-COMMAND: a blueprint stays `awaiting_approval` and never advances
--     on its own; it flips to `approved` only on an explicit operator decision.
--     The two-state lifecycle is enforced here:
--       awaiting_approval → approved.
--   - The output is the complete OS for the new venture — `idea` is the seed,
--     `business_name` is filled in as discovery resolves it, and `stages`
--     accumulates the produced operating system. Mutable.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0104_venture_blueprints_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- venture_blueprints — the operating system Builder Mode designs for a new
-- venture from an operator's "I want to build…" prompt. `idea` is the seed,
-- `business_name` resolves during discovery, and `stages` holds the 18-stage
-- venture OS (discovery → review checkpoints) — the complete operating system,
-- not just a task list. Human-in-command: `status` stays awaiting_approval until
-- an explicit operator decision flips it to approved. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists venture_blueprints (
  id             uuid          primary key default gen_random_uuid(),
  tenant_id      uuid          not null,
  idea           text          not null,
  business_name  text          not null default '',
  stages         jsonb         not null default '[]'::jsonb,
  status         text          not null default 'awaiting_approval'
                               check (status in ('awaiting_approval','approved')),
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz
);

create index if not exists venture_blueprints_tenant_status_idx
  on venture_blueprints (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for venture_blueprints. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_venture_blueprints on venture_blueprints;
create trigger set_updated_at_venture_blueprints
  before update on venture_blueprints
  for each row execute function set_updated_at();
