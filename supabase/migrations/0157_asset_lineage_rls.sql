-- =============================================================================
-- Migration: 0157_asset_lineage_rls.sql
-- Purpose:   Enable Row-Level Security on the Asset Lineage Graph
--            `asset_lineage` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on the asset_lineage table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table asset_lineage enable row level security;

-- =============================================================================
-- asset_lineage — mutable: lineage records accrue uses and influence over time
-- and are updated in place (with version bumps). select/insert/update/delete,
-- all tenant-scoped.
-- =============================================================================
create policy asset_lineage_select on asset_lineage
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_lineage_insert on asset_lineage
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_lineage_update on asset_lineage
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_lineage_delete on asset_lineage
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
