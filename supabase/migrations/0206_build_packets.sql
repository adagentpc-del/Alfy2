-- =============================================================================
-- Migration: 0206_build_packets.sql
-- Purpose:   Stand up the Build Packet Generator — a single `build_packets` table
--            storing the structured packet a coding agent can implement without
--            Alyssa repeating herself: what/why, user problem, business value, the
--            15 Architect-to-Builder artifacts, the Build-Packet-Generator extras,
--            and the build triage. Implements ADR-0135 on the tenant-scoped
--            platform.
--
-- MODEL
--   - MUTABLE: a packet moves draft -> in_review -> approved -> sent -> archived,
--     so the table carries updated_at + set_updated_at(). status constrained by a
--     CHECK mirrored from BuildPacketStatusSchema.
--   - Large artifact fields are text; list/structured fields are jsonb.
--   - awaiting_approval defaults true — nothing is built from a draft.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists build_packets (
  id                         uuid          primary key default gen_random_uuid(),
  tenant_id                  uuid          not null,
  working_name               text          not null default '',
  status                     text          not null default 'draft' check (status in (
                                             'draft','in_review','approved','sent','archived')),
  what_we_are_building       text          not null default '',
  why_we_are_building_it     text          not null default '',
  user_problem               text          not null default '',
  business_value             text          not null default '',
  executive_summary          text          not null default '',
  prd                        text          not null default '',
  user_stories               jsonb         not null default '[]'::jsonb,
  technical_architecture     text          not null default '',
  database_schema            text          not null default '',
  supabase_table_plan        text          not null default '',
  api_routes                 jsonb         not null default '[]'::jsonb,
  frontend_components        jsonb         not null default '[]'::jsonb,
  agent_requirements         jsonb         not null default '[]'::jsonb,
  security_requirements      jsonb         not null default '[]'::jsonb,
  approval_rules             jsonb         not null default '[]'::jsonb,
  implementation_sequence    jsonb         not null default '[]'::jsonb,
  testing_plan               text          not null default '',
  deployment_plan            text          not null default '',
  coding_agent_build_prompt  text          not null default '',
  required_screens           jsonb         not null default '[]'::jsonb,
  required_backend           jsonb         not null default '[]'::jsonb,
  required_database_tables   jsonb         not null default '[]'::jsonb,
  required_integrations      jsonb         not null default '[]'::jsonb,
  risks                      jsonb         not null default '[]'::jsonb,
  assumptions                jsonb         not null default '[]'::jsonb,
  acceptance_criteria        jsonb         not null default '[]'::jsonb,
  launch_checklist           jsonb         not null default '[]'::jsonb,
  triage                     jsonb         not null default '{}'::jsonb,
  awaiting_approval          boolean       not null default true,
  created_at                 timestamptz   not null default now(),
  updated_at                 timestamptz   not null default now()
);

create index if not exists build_packets_tenant_status_idx on build_packets (tenant_id, status);

drop trigger if exists set_updated_at_build_packets on build_packets;
create trigger set_updated_at_build_packets
  before update on build_packets
  for each row execute function set_updated_at();

alter table build_packets enable row level security;

create policy build_packets_select on build_packets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy build_packets_insert on build_packets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy build_packets_update on build_packets
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
