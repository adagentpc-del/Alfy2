-- =============================================================================
-- Migration: 0086_feature_classifications_rls.sql
-- Purpose:   Enable Row-Level Security on the FounderOS Commercialization Layer
--            `feature_classifications` table with a DENY-BY-DEFAULT posture,
--            then add tenant-isolation policies. Mirrors the tenancy model from
--            0002 and 0025.
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
-- Enable RLS on the feature_classifications table (deny-by-default until
-- policies are added).
-- -----------------------------------------------------------------------------
alter table feature_classifications enable row level security;

-- =============================================================================
-- feature_classifications — mutable: features are classified, re-scored, flagged
-- as SaaS candidates, and eventually marked commercialized over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy feature_classifications_select on feature_classifications
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy feature_classifications_insert on feature_classifications
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy feature_classifications_update on feature_classifications
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy feature_classifications_delete on feature_classifications
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
