-- =============================================================================
-- Migration: 0241_founder_capacity.sql
-- Purpose:   Stand up the Founder Energy + Capacity Layer (Operations Architecture
--            §31) — a single append-only `founder_capacity_snapshots` table. Each
--            row is one daily/event check-in: raw 0..10 signals (energy / stress /
--            focus / meeting_load / decision_fatigue / context_switching /
--            emotional_load / urgency / build_intensity), sleep_hours, and optional
--            health_constraints, reduced deterministically by FounderCapacityEngine
--            to a capacity_score (0..100) and a recommended_mode (protect / normal /
--            high_capacity / recovery). Mission Control reads recommended_mode to
--            adapt what it shows and when it interrupts — it never hides cash, legal,
--            or safety-critical alerts regardless of mode.
--
-- MODEL
--   - APPEND-ONLY: each row is one snapshot. No updated_at, no trigger, no UPDATE.
--   - Signal columns are nullable (no health-device integration required for v1);
--     a null signal is neutral. health_constraints is a jsonb array of strings.
--   - capacity_score / recommended_mode are computed by the engine and persisted.
--   - Enum-like recommended_mode is text, validated by the Zod contract
--     (founder-capacity.ts) + Pydantic mirror.
--
-- Tenancy: tenant_id on every row; RLS deny-by-default with policies scoped via
--          current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Capacity snapshots (append-only) ---------------------------------------
create table if not exists founder_capacity_snapshots (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  as_of              timestamptz not null,
  energy             int,
  sleep_hours        numeric,
  stress             int,
  focus              int,
  meeting_load       int,
  decision_fatigue   int,
  context_switching  int,
  emotional_load     int,
  urgency            int,
  build_intensity    int,
  health_constraints jsonb       not null default '[]'::jsonb,
  capacity_score     int         not null,
  recommended_mode   text        not null,
  do_not_interrupt   boolean     not null default false,
  created_at         timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists founder_capacity_snapshots_tenant_as_of_idx
  on founder_capacity_snapshots (tenant_id, as_of desc);

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies (SELECT + INSERT only; immutable).
-- =============================================================================
alter table founder_capacity_snapshots enable row level security;

create policy founder_capacity_snapshots_select on founder_capacity_snapshots
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy founder_capacity_snapshots_insert on founder_capacity_snapshots
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
