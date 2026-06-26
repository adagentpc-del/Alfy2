-- =============================================================================
-- Migration: 0205_taught_frameworks.sql
-- Purpose:   Stand up the Teach My Framework Engine — a single `taught_frameworks`
--            table that stores named, teachable frameworks distilled from Alyssa's
--            recurring problem-solving (explanation + artifacts: step-by-step,
--            examples, use cases, checklist, worksheet, training module, podcast
--            topic, consulting asset, FounderOS feature). Turns her natural
--            intelligence into reusable IP that helps others; feeds the Legacy
--            Archive. Implements ADR-0133 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one generated framework. No updated_at, no trigger.
--   - artifacts is the jsonb array of FrameworkArtifact; strength (0..1) drives IP
--     value.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists taught_frameworks (
  id             uuid              primary key default gen_random_uuid(),
  tenant_id      uuid              not null,
  name           text              not null,
  problem_type   text              not null,
  explanation    text              not null,
  artifacts      jsonb             not null default '[]'::jsonb,
  strength       double precision  not null default 0.5 check (strength >= 0 and strength <= 1),
  created_at     timestamptz       not null default now()
);

create index if not exists taught_frameworks_tenant_created_idx
  on taught_frameworks (tenant_id, created_at);

alter table taught_frameworks enable row level security;

create policy taught_frameworks_select on taught_frameworks
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy taught_frameworks_insert on taught_frameworks
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
