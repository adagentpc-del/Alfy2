-- =============================================================================
-- Migration: 0244_web_module_state.sql
-- Purpose:   Server-side persistence for the enterprise command-center module
--            layer (apps/web) — the answer to "module state is browser-local".
--            Two tables:
--
--            web_module_state — upsert-only KV. One row per namespaced document
--              the SPA keeps in its localStorage overlay (approvals overlay,
--              factory packets, studio episodes, Divini Pay ledger, Forge
--              registry edits, brain dumps…). Identity: (tenant_id, namespace,
--              key); value is the jsonb document. Rows are upserted, never
--              deleted — a bad sync cannot destroy server state.
--
--            vault_snapshots — APPEND-ONLY whole-vault exports (the "export
--              everything" button's server twin). Each row is one complete
--              snapshot with size/count metadata; restore = read + re-apply
--              client-side. No UPDATE, no DELETE.
--
-- SECURITY:  No credentials ever enter these tables — ModuleStateService
--            rejects credential-looking keys server-side, and the browser
--            exporter excludes them independently (two locks).
--
-- Tenancy: tenant_id on every row; RLS deny-by-default with policies scoped via
--          current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- RLS: web_module_state → SELECT + INSERT + UPDATE (upsert), no DELETE.
--      vault_snapshots  → SELECT + INSERT only (immutable).
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Module state (upsert-only KV) ------------------------------------------
create table if not exists web_module_state (
  tenant_id  uuid        not null,
  namespace  text        not null,
  key        text        not null,
  value      jsonb       not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, namespace, key)
);

create index if not exists web_module_state_tenant_ns_idx
  on web_module_state (tenant_id, namespace);

-- ---- Vault snapshots (append-only) ------------------------------------------
create table if not exists vault_snapshots (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  label       text        not null default '',
  payload     jsonb       not null,
  byte_size   int         not null,
  entry_count int         not null,
  created_at  timestamptz not null default now()
);

create index if not exists vault_snapshots_tenant_created_idx
  on vault_snapshots (tenant_id, created_at desc);

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table web_module_state enable row level security;

create policy web_module_state_select on web_module_state
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy web_module_state_insert on web_module_state
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy web_module_state_update on web_module_state
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

alter table vault_snapshots enable row level security;

create policy vault_snapshots_select on vault_snapshots
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy vault_snapshots_insert on vault_snapshots
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
