-- =============================================================================
-- Migration: 0002_rls_policies.sql
-- Purpose:   Enable Row-Level Security on every platform table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy) and
--            §4 (auditability: events + audit_log are append-only).
--
-- TENANT CONTEXT
--   Every policy scopes rows to the current tenant using a session setting:
--
--       current_setting('app.tenant_id', true)::uuid
--
--   The server process (services/api) sets this per request after resolving the
--   tenant, e.g.:
--
--       SELECT set_config('app.tenant_id', '<uuid>', true);   -- per-transaction
--
--   The second arg to current_setting() is `missing_ok = true`, so an unset
--   value returns NULL rather than erroring. NULL never equals any tenant_id,
--   so an unset context sees ZERO rows — fail-closed by construction.
--
-- DENY-BY-DEFAULT
--   Enabling RLS with no permissive policy denies all access. We then add only
--   the specific policies each table needs. Anything not granted stays denied.
--
-- APPEND-ONLY TABLES
--   `events` and `audit_log` get INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   existing rows immutable — no caller can mutate or remove them. (SECURITY §4)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on every platform table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table tenants          enable row level security;
alter table module_registry  enable row level security;
alter table agent_registry   enable row level security;
alter table events           enable row level security;
alter table decisions        enable row level security;
alter table approvals        enable row level security;
alter table memory           enable row level security;
alter table ai_cache         enable row level security;
alter table ai_usage         enable row level security;
alter table audit_log        enable row level security;

-- =============================================================================
-- tenants
-- A tenant row is visible/insertable/updatable only when it matches the current
-- tenant context. (id = tenant_id for tenants; we scope on tenant_id uniformly.)
-- =============================================================================
create policy tenants_select on tenants
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenants_insert on tenants
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenants_update on tenants
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenants_delete on tenants
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- module_registry — mutable: select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy module_registry_select on module_registry
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy module_registry_insert on module_registry
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy module_registry_update on module_registry
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy module_registry_delete on module_registry
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- agent_registry — mutable: select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy agent_registry_select on agent_registry
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_registry_insert on agent_registry
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_registry_update on agent_registry
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_registry_delete on agent_registry
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- events — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing event row immutable. (SECURITY.md §4)
-- =============================================================================
create policy events_select on events
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy events_insert on events
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- decisions — read/append within the tenant. (No update/delete needed: a
-- planner decision is a recorded fact, not edited in place.)
-- =============================================================================
create policy decisions_select on decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy decisions_insert on decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- approvals — mutable: gates are resolved (pending → approved/rejected).
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy approvals_select on approvals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approvals_insert on approvals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approvals_update on approvals
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approvals_delete on approvals
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- memory — mutable: operator context is upserted/edited over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy memory_select on memory
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_insert on memory
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_update on memory
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_delete on memory
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- ai_cache — read/append cached outputs; entries also expire and can be purged.
-- select/insert/delete, all tenant-scoped. (Cache entries are replaced, not
-- edited, so no UPDATE policy.)
-- =============================================================================
create policy ai_cache_select on ai_cache
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_cache_insert on ai_cache
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_cache_delete on ai_cache
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- ai_usage — read/append usage records within the tenant. (Usage rows are
-- recorded facts; no update/delete.)
-- =============================================================================
create policy ai_usage_select on ai_usage
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_usage_insert on ai_usage
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- audit_log — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing audit row immutable. (SECURITY.md §4)
-- =============================================================================
create policy audit_log_select on audit_log
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audit_log_insert on audit_log
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
