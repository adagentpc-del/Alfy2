-- =============================================================================
-- Migration: 0203_venture_studio_sessions.sql
-- Purpose:   Stand up the Venture Studio — a single `venture_studio_sessions`
--            table that advances an idea into a company through 17 stages
--            (discovery -> founderos_integration). Every company inherits the
--            enterprise operating standards; no business starts from zero.
--            Implements ADR-0131 on the tenant-scoped platform.
--
-- MODEL
--   - MUTABLE: a session progresses through stages over time, so the table
--     carries updated_at + set_updated_at(). current_stage is constrained by a
--     CHECK mirrored from VentureStudioStageSchema; per-stage progress lives in
--     the `stages` jsonb.
--   - inherits_operating_standards pinned true (DB CHECK). awaiting_launch_approval
--     defaults true — nothing launches without approval.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists venture_studio_sessions (
  id                              uuid          primary key default gen_random_uuid(),
  tenant_id                       uuid          not null,
  idea                            text          not null,
  working_name                    text          not null default '',
  current_stage                   text          not null default 'discovery' check (current_stage in (
                                                   'discovery','validation','market','business_model','pricing',
                                                   'brand','technology','architecture','agents','automation',
                                                   'marketing','sales','finance','legal','launch','kpis',
                                                   'founderos_integration')),
  stages                          jsonb         not null default '[]'::jsonb,
  inherits_operating_standards    boolean       not null default true check (inherits_operating_standards = true),
  awaiting_launch_approval        boolean       not null default true,
  created_at                      timestamptz   not null default now(),
  updated_at                      timestamptz   not null default now()
);

create index if not exists venture_studio_sessions_tenant_created_idx
  on venture_studio_sessions (tenant_id, created_at);

drop trigger if exists set_updated_at_venture_studio_sessions on venture_studio_sessions;
create trigger set_updated_at_venture_studio_sessions
  before update on venture_studio_sessions
  for each row execute function set_updated_at();

alter table venture_studio_sessions enable row level security;

create policy venture_studio_sessions_select on venture_studio_sessions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy venture_studio_sessions_insert on venture_studio_sessions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy venture_studio_sessions_update on venture_studio_sessions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
