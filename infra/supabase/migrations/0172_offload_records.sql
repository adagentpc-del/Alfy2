-- =============================================================================
-- Migration: 0172_offload_records.sql
-- Purpose:   Stand up the Cognitive Offloading Engine (COE) — a single
--            `offload_records` table that stores the result of running an input
--            through the five-stage L0 pipeline (Understand → Connect → Build →
--            Delegate → Executive Report). Each row records the extracted
--            understanding, the connections/built items, what was handled, and the
--            Stage-5 executive report plus the share of cognitive load removed.
--            Implements ADR-0093-cognitive-offload on the tenant-scoped platform.
--
-- OFFLOAD RECORD MODEL
--   - Each row is a COMPUTED POINT-IN-TIME RECORD for one processed input: the
--     pipeline runs and the result is written out as a dated record
--     (`created_at`).
--   - `understanding` is the Stage-1 extraction; `connections` and `built` are the
--     Connect/Build outputs; `handled` is the per-item delegation disposition.
--   - The Stage-5 executive report (`what_changed`, `why_it_matters`,
--     `completed_automatically`, `decisions_requiring_alyssa`) surfaces only what
--     needs executive attention; `cognitive_load_removed` is the 0..1 share taken
--     off Alyssa's plate.
--   - Records are APPEND-ONLY: a row is a recorded run, not edited in place. There
--     is no updated_at and no trigger — successive runs append new records.
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
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every record immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- offload_records — a computed point-in-time COE record for one processed input.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists offload_records (
  id                          uuid              primary key default gen_random_uuid(),
  tenant_id                   uuid              not null,
  kind                        text              not null check (kind in (
                                                  'conversation', 'voice_note', 'meeting_transcript',
                                                  'email', 'pdf', 'image', 'message', 'uploaded_file')),
  understanding               jsonb             not null default '{}'::jsonb,
  connections                 jsonb             not null default '[]'::jsonb,
  built                       jsonb             not null default '[]'::jsonb,
  handled                     jsonb             not null default '[]'::jsonb,
  what_changed                text              not null default '',
  why_it_matters              text              not null default '',
  completed_automatically     jsonb             not null default '[]'::jsonb,
  decisions_requiring_alyssa  jsonb             not null default '[]'::jsonb,
  cognitive_load_removed      numeric           not null check (cognitive_load_removed >= 0 and cognitive_load_removed <= 1),
  created_at                  timestamptz       not null default now()
);

create index if not exists offload_records_tenant_created_idx
  on offload_records (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on offload_records (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table offload_records enable row level security;

-- =============================================================================
-- offload_records — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing record immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy offload_records_select on offload_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy offload_records_insert on offload_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
