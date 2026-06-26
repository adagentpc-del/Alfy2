-- =============================================================================
-- Migration: 0207_code_handoffs.sql
-- Purpose:   Stand up Code Execution Handoff — a single `code_handoffs` table that
--            stores the plan a coding agent needs for one APPROVED Build Packet:
--            branch plan, file plan, implementation prompt, acceptance criteria,
--            tests, rollback plan, security checks, migration plan, Supabase config,
--            deployment checklist. Implements ADR-0136 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is the handoff plan as generated. No updated_at, no
--     trigger. References its build_packet (build_packet_id).
--   - production_requires_approval pinned true (DB CHECK): build is permitted, but
--     merge/deploy/production needs Alyssa's approval.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists code_handoffs (
  id                            uuid          primary key default gen_random_uuid(),
  tenant_id                     uuid          not null,
  build_packet_id               uuid          not null,
  branch_plan                   text          not null,
  file_plan                     jsonb         not null default '[]'::jsonb,
  implementation_prompt         text          not null default '',
  acceptance_criteria           jsonb         not null default '[]'::jsonb,
  tests                         jsonb         not null default '[]'::jsonb,
  rollback_plan                 text          not null default '',
  security_checks               jsonb         not null default '[]'::jsonb,
  database_migration_plan       text          not null default '',
  supabase_configuration        text          not null default '',
  deployment_checklist          jsonb         not null default '[]'::jsonb,
  production_requires_approval  boolean       not null default true check (production_requires_approval = true),
  created_at                    timestamptz   not null default now()
);

create index if not exists code_handoffs_tenant_created_idx on code_handoffs (tenant_id, created_at);
create index if not exists code_handoffs_packet_idx on code_handoffs (build_packet_id);

alter table code_handoffs enable row level security;

create policy code_handoffs_select on code_handoffs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy code_handoffs_insert on code_handoffs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
