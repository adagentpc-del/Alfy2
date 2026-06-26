-- =============================================================================
-- Migration: 0195_vision_sessions.sql
-- Purpose:   Stand up the Vision Builder — a single `vision_sessions` table that
--            stores each collaborative thinking session: the idea, the
--            thought-partner phase (exploration, challenges, strengthened points,
--            risks, opportunities), the generated artifacts (architecture,
--            implementation plan, business model, marketing, monetization, assets,
--            agents, workflows, roadmap), the overall promise, and the
--            always-true awaiting_approval flag — Vision Builder never
--            auto-executes. Implements ADR-0125-vision-builder on the
--            tenant-scoped platform.
--
-- VISION SESSION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SESSION for one idea: the engine acts
--     as a thought partner and writes out the result as a dated record
--     (`created_at`).
--   - `idea` is what was explored; the jsonb arrays capture the thought-partner
--     phase and the generated artifacts; `promise` is the 0..1 overall promise;
--     `awaiting_approval` is always true — execution begins only after approval.
--   - Sessions are APPEND-ONLY: a row is a recorded session, not edited in place.
--     There is no updated_at and no trigger — re-exploring appends a row.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every session immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- vision_sessions — a computed point-in-time session for one idea.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists vision_sessions (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  idea                text              not null,
  exploration         jsonb             not null default '[]'::jsonb,
  challenges          jsonb             not null default '[]'::jsonb,
  strengthened        jsonb             not null default '[]'::jsonb,
  risks               jsonb             not null default '[]'::jsonb,
  opportunities       jsonb             not null default '[]'::jsonb,
  artifacts           jsonb             not null default '[]'::jsonb,
  promise             numeric           not null check (promise >= 0 and promise <= 1),
  awaiting_approval   boolean           not null default true check (awaiting_approval = true),
  created_at          timestamptz       not null default now()
);

create index if not exists vision_sessions_tenant_created_idx
  on vision_sessions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on vision_sessions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table vision_sessions enable row level security;

-- =============================================================================
-- vision_sessions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing session immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy vision_sessions_select on vision_sessions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy vision_sessions_insert on vision_sessions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
