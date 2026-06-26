-- =============================================================================
-- Migration: 0017_global_assets_rls.sql
-- Purpose:   Enable Row-Level Security on the Global Asset Library table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy).
--            Companion to 0016_global_assets.sql.
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
--
-- PERMISSION-AWARE FILTERING (APPLICATION LAYER)
--   This RLS guarantees TENANT ISOLATION only. Finer-grained, per-asset
--   permission filtering — private/sensitive assets, owner checks, and
--   role-based visibility (the `sensitive`, `visibility`, and `owner` columns) —
--   is applied in the APPLICATION layer ON TOP OF this tenant RLS. The database
--   never returns another tenant's assets; the application narrows further to
--   what the requesting user is allowed to see within the tenant.
--
-- MUTABLE TABLES
--   `assets` is mutable — an asset is versioned, approved, archived, and re-used
--   over its lifetime. The table gets SELECT + INSERT + UPDATE + DELETE policies,
--   all tenant-scoped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Global Asset Library table (deny-by-default until policies
-- added).
-- -----------------------------------------------------------------------------
alter table assets enable row level security;

-- =============================================================================
-- assets — mutable: assets are registered, versioned, approved, archived, and
-- re-used over their lifetime. select/insert/update/delete, all tenant-scoped.
-- Per-asset permission filtering (private/sensitive, owner, role) is layered on
-- top of this tenant RLS in the application.
-- =============================================================================
create policy assets_select on assets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy assets_insert on assets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy assets_update on assets
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy assets_delete on assets
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
