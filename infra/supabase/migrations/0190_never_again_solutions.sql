-- =============================================================================
-- Migration: 0190_never_again_solutions.sql
-- Purpose:   Stand up the Never Again Engine — a single `never_again_solutions`
--            table that turns a repeated frustration (i_forgot / happened_again /
--            annoying / i_hate_this / always_breaks / wastes_time) into permanent
--            infrastructure: problem, root cause, permanent solution, and the
--            workflow, automation, agent, checklist, SOP, reminder, knowledge
--            update, and policy that ensure nothing annoys Alyssa twice.
--            Implements ADR-0116-never-again on the tenant-scoped platform.
--
-- NEVER AGAIN SOLUTION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SOLUTION for one frustration: the
--     engine derives the permanent fix and writes out the result as a dated
--     record (`created_at`).
--   - `trigger` is the frustration signal; `problem`/`root_cause`/
--     `permanent_solution` and the infrastructure columns capture the fix;
--     `checklist` is the jsonb steps; `priority` rises with occurrences.
--   - Solutions are APPEND-ONLY: a row is a recorded resolution, not edited in
--     place. There is no updated_at and no trigger — re-solving appends a row.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every solution immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- never_again_solutions — a computed point-in-time solution for one frustration.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists never_again_solutions (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  trigger             text              not null check (trigger in (
                                          'i_forgot', 'happened_again', 'annoying', 'i_hate_this',
                                          'always_breaks', 'wastes_time')),
  problem             text              not null,
  root_cause          text              not null,
  permanent_solution  text              not null,
  workflow            text              not null default '',
  automation          text              not null default '',
  agent               text              not null default '',
  checklist           jsonb             not null default '[]'::jsonb,
  sop                 text              not null default '',
  reminder            text              not null default '',
  knowledge_update    text              not null default '',
  policy              text              not null default '',
  priority            numeric           not null check (priority >= 0 and priority <= 1),
  created_at          timestamptz       not null default now()
);

create index if not exists never_again_solutions_tenant_created_idx
  on never_again_solutions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on never_again_solutions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table never_again_solutions enable row level security;

-- =============================================================================
-- never_again_solutions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing solution immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy never_again_solutions_select on never_again_solutions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy never_again_solutions_insert on never_again_solutions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
