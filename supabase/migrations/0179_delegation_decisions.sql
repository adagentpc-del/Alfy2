-- =============================================================================
-- Migration: 0179_delegation_decisions.sql
-- Purpose:   Stand up the Executive Delegation System — a single
--            `delegation_decisions` table that stores, for each task, the owner it
--            should be routed to (alyssa_only / ai_agent / human_contractor /
--            specialist / attorney_cpa / assistant / automation / defer / delete),
--            the reason, and the founder hours returned by offloading it. Keeps
--            Alyssa focused on vision, relationships, high-value sales, strategic
--            decisions, creative insight, and approvals. Implements
--            ADR-0102-delegation on the tenant-scoped platform.
--
-- DELEGATION DECISION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME DECISION for one task: the system
--     classifies it and writes out the decision as a dated record (`created_at`).
--   - `owner` is the routing target; `hours_returned` is the founder time freed.
--   - Decisions are APPEND-ONLY: a row is a recorded classification, not edited in
--     place. There is no updated_at and no trigger — re-classifying appends a row.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every decision immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- delegation_decisions — a computed point-in-time delegation decision for one
-- task. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists delegation_decisions (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  task              text              not null,
  owner             text              not null check (owner in (
                                        'alyssa_only', 'ai_agent', 'human_contractor', 'specialist',
                                        'attorney_cpa', 'assistant', 'automation', 'defer', 'delete')),
  reason            text              not null,
  hours_returned    numeric           not null check (hours_returned >= 0),
  created_at        timestamptz       not null default now()
);

create index if not exists delegation_decisions_tenant_created_idx
  on delegation_decisions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on delegation_decisions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table delegation_decisions enable row level security;

-- =============================================================================
-- delegation_decisions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing decision immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy delegation_decisions_select on delegation_decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy delegation_decisions_insert on delegation_decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
