-- =============================================================================
-- Migration: 0090_hierarchy_nodes_rls.sql
-- Purpose:   Enable Row-Level Security on the Enterprise Hierarchy
--            `hierarchy_nodes` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
--   the specific policies the table needs. Anything not granted stays denied.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on hierarchy_nodes (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table hierarchy_nodes enable row level security;

-- =============================================================================
-- hierarchy_nodes — mutable: the enterprise tree is built up and restructured
-- over time (nodes added, renamed, re-parented, removed). select/insert/update/
-- delete, all tenant-scoped.
-- =============================================================================
create policy hierarchy_nodes_select on hierarchy_nodes
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy hierarchy_nodes_insert on hierarchy_nodes
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy hierarchy_nodes_update on hierarchy_nodes
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy hierarchy_nodes_delete on hierarchy_nodes
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
