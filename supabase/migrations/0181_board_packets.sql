-- =============================================================================
-- Migration: 0181_board_packets.sql
-- Purpose:   Stand up the Board Packet Generator — a single `board_packets` table
--            that stores board-level monthly reporting (executive summary, the
--            structured sections, and the next 30/60/90 actions) so Alyssa
--            operates like the CEO of a serious company before it is large.
--            Implements ADR-0104-board-packet on the tenant-scoped platform.
--
-- BOARD PACKET MODEL
--   - Each row is a COMPUTED POINT-IN-TIME PACKET for one period: the generator
--     assembles the report and writes it out as a dated packet (`created_at`).
--   - `executive_summary` is the headline; `sections` holds the per-heading item
--     lists; `next_30_60_90` is the forward action list.
--   - Packets are APPEND-ONLY: a row is a recorded monthly report, not edited in
--     place. There is no updated_at and no trigger — each period appends a packet.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every packet immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- board_packets — a computed point-in-time monthly board packet for one period.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists board_packets (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  period_label        text              not null,
  executive_summary   text              not null,
  sections            jsonb             not null default '[]'::jsonb,
  next_30_60_90       jsonb             not null default '[]'::jsonb,
  created_at          timestamptz       not null default now()
);

create index if not exists board_packets_tenant_created_idx
  on board_packets (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on board_packets (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table board_packets enable row level security;

-- =============================================================================
-- board_packets — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing packet immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy board_packets_select on board_packets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy board_packets_insert on board_packets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
