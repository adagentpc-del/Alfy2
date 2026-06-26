-- =============================================================================
-- Migration: 0213_press_live_evaluations.sql
-- Purpose:   Stand up Press Live Mode — a single `press_live_evaluations` table
--            recording each launch run: the pre-launch checks (each carrying, when
--            failed, the exact missing item + where to get it + where to paste it),
--            the outcome (ready_to_launch / blocked_by_secrets / blocked_by_config /
--            blocked_by_test_failure / live), and the blocking checks. Implements
--            ADR-0144 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one Press Live run. No updated_at, no trigger.
--   - outcome constrained by a CHECK mirrored from PressLiveOutcomeSchema.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists press_live_evaluations (
  id                uuid          primary key default gen_random_uuid(),
  tenant_id         uuid          not null,
  build_packet_id   uuid          null,
  checks            jsonb         not null default '[]'::jsonb,
  outcome           text          not null check (outcome in (
                                    'ready_to_launch','blocked_by_secrets','blocked_by_config',
                                    'blocked_by_test_failure','live')),
  blocking          jsonb         not null default '[]'::jsonb,
  created_at        timestamptz   not null default now()
);

create index if not exists press_live_evaluations_tenant_created_idx
  on press_live_evaluations (tenant_id, created_at);

alter table press_live_evaluations enable row level security;

create policy press_live_evaluations_select on press_live_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy press_live_evaluations_insert on press_live_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
