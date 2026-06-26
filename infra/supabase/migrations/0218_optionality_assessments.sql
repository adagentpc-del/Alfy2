-- =============================================================================
-- Migration: 0218_optionality_assessments.sql
-- Purpose:   Stand up the Optionality Engine — a single `optionality_assessments`
--            table recording, for one decision, the per-path optionality verdicts
--            and the recommended path (greatest long-term optionality; on an EV
--            tie, the path preserving the most choices). Implements ADR-0149 on the
--            tenant-scoped platform.
--
-- MODEL: APPEND-ONLY (point-in-time assessment).
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists optionality_assessments (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  decision           text          not null,
  verdicts           jsonb         not null default '[]'::jsonb,
  recommended_path   text          not null,
  reason             text          not null,
  created_at         timestamptz   not null default now()
);

create index if not exists optionality_assessments_tenant_created_idx
  on optionality_assessments (tenant_id, created_at);

alter table optionality_assessments enable row level security;

create policy optionality_assessments_select on optionality_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy optionality_assessments_insert on optionality_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
