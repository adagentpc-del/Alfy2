-- =============================================================================
-- Migration: 0215_access_grants_memory.sql
-- Purpose:   Stand up Permission Memory & Reuse — a single `access_grants_memory`
--            table remembering which tools, folders, accounts, and workspaces
--            already have approved access (with scope, grant/expiry dates, risk,
--            renewal trigger, last verified) so Alfy² reuses access instead of
--            re-asking, escalating only when expired / revoked / risky / changed.
--            Implements ADR-0146 on the tenant-scoped platform. (Named
--            access_grants_memory to avoid the tenancy `grants` and security
--            `permission_groups` tables.)
--
-- MODEL
--   - MUTABLE: status + last_verified_at change over time, so the table carries
--     updated_at + set_updated_at(). status + risk_level CHECK-constrained.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists access_grants_memory (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  tool               text          not null,
  workspace          text          not null default '',
  folder_path        text          not null default '',
  account            text          not null default '',
  scope              text          not null default '',
  granted_at         timestamptz   not null default now(),
  expires_at         timestamptz   null,
  risk_level         text          not null default 'low' check (risk_level in ('low','medium','high')),
  renewal_trigger    text          not null default '',
  last_verified_at   timestamptz   null,
  status             text          not null default 'active' check (status in ('active','expired','revoked')),
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);

create index if not exists access_grants_memory_tenant_tool_idx on access_grants_memory (tenant_id, tool);

drop trigger if exists set_updated_at_access_grants_memory on access_grants_memory;
create trigger set_updated_at_access_grants_memory
  before update on access_grants_memory
  for each row execute function set_updated_at();

alter table access_grants_memory enable row level security;

create policy access_grants_memory_select on access_grants_memory
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy access_grants_memory_insert on access_grants_memory
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy access_grants_memory_update on access_grants_memory
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
