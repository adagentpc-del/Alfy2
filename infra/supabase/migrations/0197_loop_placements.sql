-- =============================================================================
-- Migration: 0197_loop_placements.sql
-- Purpose:   Stand up the Infinite Loop placement store — a single
--            `loop_placements` table that records, for one module, where it sits
--            in Alfy²'s highest-level operating cycle (Observe -> Capture ->
--            Organize -> Understand -> Decide -> Execute -> Measure -> Reflect ->
--            Improve -> Compound -> Multiply -> Increase Freedom -> Observe again):
--            its `primary_stage` (the stage it most strongly performs), the
--            `feeds_stage` it hands off to next, the `in_loop` flag (true when the
--            module participates at all), and a `note`. No feature exists outside
--            the loop; everything feeds the next cycle so the system compounds.
--            Implements ADR-0120-infinite-loop on the tenant-scoped platform.
--
-- LOOP PLACEMENT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME PLACEMENT for one module: the engine
--     scores the module's strength at each of the twelve stages and writes out the
--     dominant stage, the stage it feeds, and whether it is in the loop, as a
--     dated record (`created_at`).
--   - `module` is what was placed; `primary_stage`/`feeds_stage` are constrained to
--     the twelve loop stages; `in_loop` is the participation flag; `note` explains
--     the placement.
--   - Placements are APPEND-ONLY: a row is a recorded placement, not edited in
--     place. There is no updated_at and no trigger — re-placing appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--   - Stage enums are mirrored from LoopStageSchema in
--     packages/shared/src/contracts/infinite-loop.ts via CHECK constraints.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every placement immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- loop_placements — a computed point-in-time placement for one module.
-- Append-only (no updated_at, no trigger). Stage columns constrained to the
-- twelve loop stages from LoopStageSchema.
-- -----------------------------------------------------------------------------
create table if not exists loop_placements (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  module            text              not null,
  primary_stage     text              not null check (primary_stage in (
                                        'observe', 'capture', 'organize', 'understand',
                                        'decide', 'execute', 'measure', 'reflect',
                                        'improve', 'compound', 'multiply', 'increase_freedom')),
  feeds_stage       text              not null check (feeds_stage in (
                                        'observe', 'capture', 'organize', 'understand',
                                        'decide', 'execute', 'measure', 'reflect',
                                        'improve', 'compound', 'multiply', 'increase_freedom')),
  in_loop           boolean           not null,
  note              text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists loop_placements_tenant_created_idx
  on loop_placements (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on loop_placements (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table loop_placements enable row level security;

-- =============================================================================
-- loop_placements — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing placement immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy loop_placements_select on loop_placements
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy loop_placements_insert on loop_placements
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
