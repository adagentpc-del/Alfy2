-- =============================================================================
-- Migration: 0223_connections.sql
-- Purpose:   Stand up the Connections layer — the "Set up & Connect" surface.
--            Two tables:
--              1. `connector_definitions` — the extensible catalog of WHAT can be
--                 connected (provider, category, auth_kind, required secret keys).
--                 New platforms are registered here at runtime; no enum change.
--              2. `connections` — an actual connection at a SCOPE (master /
--                 business / personal), each with its own credentials (secret
--                 references, never values). A business connection overrides the
--                 master; with none, the business inherits the master.
--            Implements ADR-0154 on the tenant-scoped platform. Composes the
--            Connector Registry, Human Touch Queue, Permission Memory, SecretVault.
--
-- MODEL
--   - Both tables are MUTABLE (status / health / catalog edits) → updated_at +
--     set_updated_at().
--   - connections.secret_refs holds REFERENCES into the SecretVault; raw secret
--     values are never stored here.
--   - Uniqueness: one definition per (tenant, provider); one connection per
--     (tenant, provider, scope, business). business_id is normalized via COALESCE
--     so master/personal (null business_id) are unique per provider too.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE
--   (retire a connector via enabled=false; revoke a connection via status).
-- Idempotent where reasonable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- connector_definitions — the extensible catalog of connectable platforms.
-- ---------------------------------------------------------------------------
create table if not exists connector_definitions (
  id                    uuid          primary key default gen_random_uuid(),
  tenant_id             uuid          not null,
  provider              text          not null,
  display_name          text          not null,
  category              text          not null,
  auth_kind             text          not null check (auth_kind in ('oauth2','api_key','webhook','basic','none')),
  required_secret_keys  jsonb         not null default '[]'::jsonb,
  default_scopes        jsonb         not null default '[]'::jsonb,
  risk_level            text          not null default 'low' check (risk_level in ('low','medium','high')),
  docs_url              text          not null default '',
  enabled               boolean       not null default true,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

create unique index if not exists connector_definitions_tenant_provider_idx
  on connector_definitions (tenant_id, provider);

drop trigger if exists set_updated_at_connector_definitions on connector_definitions;
create trigger set_updated_at_connector_definitions
  before update on connector_definitions
  for each row execute function set_updated_at();

alter table connector_definitions enable row level security;

create policy connector_definitions_select on connector_definitions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy connector_definitions_insert on connector_definitions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy connector_definitions_update on connector_definitions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- connections — a scoped connection instance with its own credentials.
-- ---------------------------------------------------------------------------
create table if not exists connections (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  scope              text              not null check (scope in ('master','business','personal')),
  business_id        uuid              null,
  provider           text              not null,
  label              text              not null default '',
  status             text              not null default 'not_connected' check (status in (
                                         'not_connected','pending_setup','connected','error','expired','revoked')),
  granted_scopes     jsonb             not null default '[]'::jsonb,
  secret_refs        jsonb             not null default '[]'::jsonb,
  health             double precision  not null default 0 check (health >= 0 and health <= 1),
  last_verified_at   timestamptz       null,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz       not null default now(),
  -- business scope requires a business_id; master/personal must not have one.
  constraint connections_scope_business_ck check (
    (scope = 'business' and business_id is not null) or
    (scope <> 'business' and business_id is null)
  )
);

create index if not exists connections_tenant_provider_idx on connections (tenant_id, provider);
create index if not exists connections_tenant_business_idx on connections (tenant_id, business_id);
-- One connection per (tenant, provider, scope, business). COALESCE normalizes null business_id.
create unique index if not exists connections_unique_scope_idx
  on connections (tenant_id, provider, scope,
                  coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid));

drop trigger if exists set_updated_at_connections on connections;
create trigger set_updated_at_connections
  before update on connections
  for each row execute function set_updated_at();

alter table connections enable row level security;

create policy connections_select on connections
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy connections_insert on connections
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy connections_update on connections
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
