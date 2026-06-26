-- =============================================================================
-- Migration: 0015_github_intelligence_rls.sql
-- Purpose:   Enable Row-Level Security on the GitHub Intelligence System tables
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy).
--            Companion to 0014_github_intelligence.sql.
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
-- TABLES
--   `repo_assessments` is a static-scan record — assessments are written and
--   read, never executed. `asset_library` is mutable — approved repositories are
--   curated (tags, approval metadata) over their life. Both tables get
--   SELECT + INSERT + UPDATE + DELETE policies, all tenant-scoped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the GitHub Intelligence tables (deny-by-default until policies
-- added).
-- -----------------------------------------------------------------------------
alter table repo_assessments enable row level security;
alter table asset_library    enable row level security;

-- =============================================================================
-- repo_assessments — persisted static scans of repositories. Nothing is ever
-- executed; rows are written and read. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy repo_assessments_select on repo_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy repo_assessments_insert on repo_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy repo_assessments_update on repo_assessments
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy repo_assessments_delete on repo_assessments
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- asset_library — mutable: approved repositories are curated (tags, approval
-- metadata) over their lifetime. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy asset_library_select on asset_library
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_library_insert on asset_library
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_library_update on asset_library
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_library_delete on asset_library
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
