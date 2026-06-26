-- =============================================================================
-- Migration: 0209_ship_gate_evaluations.sql
-- Purpose:   Stand up the Ship Gate — a single `ship_gate_evaluations` table that
--            records each gate run: the eight checks (requirement, security,
--            permission, database, test, documentation, rollback, approval), the
--            verdict (ready_to_ship / needs_review / do_not_ship), and the blocking
--            checks. Alyssa must approve final shipping. Implements ADR-0138 on the
--            tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one evaluation. No updated_at, no trigger.
--   - verdict constrained by a CHECK mirrored from ShipVerdictSchema.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists ship_gate_evaluations (
  id                uuid          primary key default gen_random_uuid(),
  tenant_id         uuid          not null,
  build_packet_id   uuid          null,
  checks            jsonb         not null default '[]'::jsonb,
  verdict           text          not null check (verdict in ('ready_to_ship','needs_review','do_not_ship')),
  blocking          jsonb         not null default '[]'::jsonb,
  created_at        timestamptz   not null default now()
);

create index if not exists ship_gate_evaluations_tenant_created_idx
  on ship_gate_evaluations (tenant_id, created_at);

alter table ship_gate_evaluations enable row level security;

create policy ship_gate_evaluations_select on ship_gate_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ship_gate_evaluations_insert on ship_gate_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
