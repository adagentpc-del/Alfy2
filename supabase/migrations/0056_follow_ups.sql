-- =============================================================================
-- Migration: 0056_follow_ups.sql
-- Purpose:   Stand up the Alfy² Follow-Up Execution Engine — a single
--            `follow_ups` table that drives the operator's follow-up loop across
--            every entity that needs chasing. Implements the Follow-Up Execution
--            Engine on top of the tenant-scoped platform.
--
-- FOLLOW-UP EXECUTION MODEL
--   - The engine tracks follow-ups across 9 entity kinds:
--       lead, warm_contact, deal, vendor, investor, client, partner,
--       unanswered_email, stale_opportunity.
--   - Each follow-up runs a `sequence` of touches, tracks reminders, and lands
--     in an approval queue first: a follow-up starts at status
--     'pending_approval' and only begins executing once approved.
--   - `no_response_policy` ('escalate' by default) governs what happens when a
--     touch goes unanswered, and `reactivation` flags follow-ups that re-engage
--     a dormant entity.
--   - Once APPROVED, the engine keeps going on its own — advancing
--     `current_step`, stamping `last_touch_at`, and scheduling `next_touch_at` —
--     until one of these stops it:
--       response_received, goal_reached, sequence_completed, risk, paused,
--       manual.
--     `status` carries the lifecycle (pending_approval → active → paused/
--     completed/stopped) and `stop_reason` records WHY a follow-up stopped.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0057_follow_ups_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- follow_ups — a follow-up the engine is executing against one of 9 entity
-- kinds. Runs a sequence of touches through an approval queue, then (once
-- approved) keeps going on autopilot — advancing current_step, stamping
-- last_touch_at, scheduling next_touch_at — until a stop condition fires. The
-- status carries the lifecycle and stop_reason records why it stopped. The
-- no_response_policy governs unanswered touches; reactivation flags dormant
-- re-engagement. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists follow_ups (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  entity_kind         text              not null
                                        check (entity_kind in (
                                          'lead','warm_contact','deal','vendor','investor',
                                          'client','partner','unanswered_email','stale_opportunity')),
  entity_name         text              not null,
  business_id         uuid,
  goal_id             uuid,
  sequence            jsonb             not null default '[]'::jsonb,
  current_step        integer           not null default 0,
  status              text              not null default 'pending_approval'
                                        check (status in (
                                          'pending_approval','active','paused','completed','stopped')),
  stop_reason         text              check (stop_reason in (
                                          'response_received','goal_reached','sequence_completed',
                                          'risk','paused','manual')),
  no_response_policy  text              not null default 'escalate',
  reactivation        boolean           not null default false,
  last_touch_at       timestamptz,
  next_touch_at       timestamptz,
  created_at          timestamptz       not null default now(),
  updated_at          timestamptz
);

create index if not exists follow_ups_tenant_status_idx
  on follow_ups (tenant_id, status);

create index if not exists follow_ups_tenant_entity_kind_idx
  on follow_ups (tenant_id, entity_kind);

create index if not exists follow_ups_tenant_next_touch_idx
  on follow_ups (tenant_id, next_touch_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for follow_ups. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_follow_ups on follow_ups;
create trigger set_updated_at_follow_ups
  before update on follow_ups
  for each row execute function set_updated_at();
