-- =============================================================================
-- Migration: 0001_platform_core.sql
-- Purpose:   Create the Alfy² platform tables (no business/domain rows).
--            Implements TECH_SPEC.md §5 (data model) and SECURITY.md §2/§4.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by a shared trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0002_rls_policies.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create extension/table if not exists).
-- =============================================================================

-- gen_random_uuid() is provided by pgcrypto.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger function.
-- Attached only to mutable tables (module_registry, agent_registry, approvals,
-- memory). Keeps updated_at in sync on every UPDATE.
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- tenants — tenant root. One row in single-operator mode.
-- tenant_id references its own id (set in the seed) to keep RLS uniform across
-- every platform table.
-- -----------------------------------------------------------------------------
create table if not exists tenants (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  name        text        not null,
  status      text        not null default 'active',
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- module_registry — installed modules + their manifest. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists module_registry (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  module_id   text        not null,
  version     text        not null,
  manifest    jsonb       not null,
  enabled     boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (tenant_id, module_id)
);

-- -----------------------------------------------------------------------------
-- agent_registry — installed agents + endpoints. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists agent_registry (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  agent_key     text        not null,
  runtime       text        not null check (runtime in ('python','typescript')),
  endpoint      text        not null,
  version       text        not null,
  registration  jsonb       not null,
  enabled       boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (tenant_id, agent_key)
);

-- -----------------------------------------------------------------------------
-- events — append-only event log (immutable). Correlated by trace_id.
-- Immutability is enforced in 0002 via deny-by-default + no UPDATE/DELETE policy.
-- -----------------------------------------------------------------------------
create table if not exists events (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  trace_id    uuid        not null,
  event_type  text        not null,
  payload     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists events_tenant_trace_idx on events (tenant_id, trace_id);
create index if not exists events_tenant_type_idx  on events (tenant_id, event_type);

-- -----------------------------------------------------------------------------
-- decisions — planner choices + rationale. FK → events.
-- -----------------------------------------------------------------------------
create table if not exists decisions (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  event_id    uuid        references events(id),
  trace_id    uuid        not null,
  rationale   text        not null,
  plan        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- approvals — pending/resolved approval gates. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists approvals (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  trace_id        uuid,
  action_label    text        not null,
  action_payload  jsonb       not null default '{}'::jsonb,
  status          text        not null default 'pending'
                              check (status in ('pending','approved','rejected')),
  resolved_at     timestamptz,
  resolved_by     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- -----------------------------------------------------------------------------
-- memory — operator profile/context. Mutable, audited writes.
-- -----------------------------------------------------------------------------
create table if not exists memory (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  kind        text        not null,
  key         text        not null,
  value       jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (tenant_id, kind, key)
);

-- -----------------------------------------------------------------------------
-- ai_cache — content-hash → cached AI output, with TTL.
-- -----------------------------------------------------------------------------
create table if not exists ai_cache (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  content_hash  text        not null,
  model         text        not null,
  output        jsonb       not null,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (tenant_id, content_hash)
);

-- -----------------------------------------------------------------------------
-- ai_usage — per-call tokens/cost/model, for budgets & reporting.
-- -----------------------------------------------------------------------------
create table if not exists ai_usage (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  trace_id           uuid,
  model              text          not null,
  prompt_tokens      integer       not null default 0,
  completion_tokens  integer       not null default 0,
  cost_usd           numeric(12,6) not null default 0,
  created_at         timestamptz   not null default now()
);

-- -----------------------------------------------------------------------------
-- audit_log — append-only security-relevant actions (who/what/when).
-- Immutability is enforced in 0002 via deny-by-default + no UPDATE/DELETE policy.
-- -----------------------------------------------------------------------------
create table if not exists audit_log (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  actor       text        not null,
  action      text        not null,
  target      text,
  detail      jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at triggers for the mutable tables.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_module_registry on module_registry;
create trigger set_updated_at_module_registry
  before update on module_registry
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_agent_registry on agent_registry;
create trigger set_updated_at_agent_registry
  before update on agent_registry
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_approvals on approvals;
create trigger set_updated_at_approvals
  before update on approvals
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_memory on memory;
create trigger set_updated_at_memory
  before update on memory
  for each row execute function set_updated_at();
