-- =============================================================================
-- Migration: 0173_logistics_plans.sql
-- Purpose:   Stand up the Life Logistics Engine — a single `logistics_plans`
--            table that stores the auto-generated preparation for a detected
--            future event: checklists, calendar blocks, reminders, and follow-ups,
--            so Alyssa never has to remember it. Implements
--            ADR-0094-life-logistics on the tenant-scoped platform.
--
-- LOGISTICS PLAN MODEL
--   - Each row is a COMPUTED POINT-IN-TIME PLAN for one event: the engine detects
--     the event and writes out the generated prep as a dated plan (`created_at`).
--   - `checklists`, `calendar_blocks`, and `reminders` hold the structured prep;
--     `follow_ups` are the after-event actions.
--   - Plans are APPEND-ONLY: a row is a generated plan, not edited in place. There
--     is no updated_at and no trigger — re-running detection appends a new plan.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every plan immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- logistics_plans — a computed point-in-time logistics plan for one event.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists logistics_plans (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  event             text              not null,
  starts_at         timestamptz       not null,
  checklists        jsonb             not null default '[]'::jsonb,
  calendar_blocks   jsonb             not null default '[]'::jsonb,
  reminders         jsonb             not null default '[]'::jsonb,
  follow_ups        jsonb             not null default '[]'::jsonb,
  created_at        timestamptz       not null default now()
);

create index if not exists logistics_plans_tenant_created_idx
  on logistics_plans (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on logistics_plans (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table logistics_plans enable row level security;

-- =============================================================================
-- logistics_plans — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing plan immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy logistics_plans_select on logistics_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy logistics_plans_insert on logistics_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
