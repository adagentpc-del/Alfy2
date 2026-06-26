-- =============================================================================
-- Migration: 0210_conversation_to_code_runs.sql
-- Purpose:   Stand up the Conversation-to-Code Pipeline — a single
--            `conversation_to_code_runs` table tracking one idea's journey through
--            12 stages (conversation -> ... -> compounding_asset). Every build
--            feeds the Compounding Engine. Implements ADR-0141 on the tenant-scoped
--            platform.
--
-- MODEL
--   - MUTABLE: a run advances stage by stage, so the table carries updated_at +
--     set_updated_at(). current_stage constrained by a CHECK mirrored from
--     PipelineStageSchema; per-stage status lives in the `stages` jsonb.
--   - feeds_compounding_engine pinned true (DB CHECK). awaiting_approval defaults
--     true — no deployment without approval.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists conversation_to_code_runs (
  id                          uuid          primary key default gen_random_uuid(),
  tenant_id                   uuid          not null,
  idea                        text          not null,
  working_name                text          not null default '',
  current_stage               text          not null default 'conversation' check (current_stage in (
                                              'conversation','structured_spec','build_packet','security_review',
                                              'code_agent_handoff','implementation','review','testing','approval',
                                              'deployment','documentation','compounding_asset')),
  stages                      jsonb         not null default '[]'::jsonb,
  build_packet_id             uuid          null,
  feeds_compounding_engine    boolean       not null default true check (feeds_compounding_engine = true),
  awaiting_approval           boolean       not null default true,
  created_at                  timestamptz   not null default now(),
  updated_at                  timestamptz   not null default now()
);

create index if not exists conversation_to_code_runs_tenant_created_idx
  on conversation_to_code_runs (tenant_id, created_at);

drop trigger if exists set_updated_at_conversation_to_code_runs on conversation_to_code_runs;
create trigger set_updated_at_conversation_to_code_runs
  before update on conversation_to_code_runs
  for each row execute function set_updated_at();

alter table conversation_to_code_runs enable row level security;

create policy conversation_to_code_runs_select on conversation_to_code_runs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy conversation_to_code_runs_insert on conversation_to_code_runs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy conversation_to_code_runs_update on conversation_to_code_runs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
