-- =============================================================================
-- Migration: 0006_business_rls.sql
-- Purpose:   Enable Row-Level Security on the Business Template tables with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements SECURITY.md §2 (tenancy). Companion to 0005_business.sql.
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
-- MUTABLE TABLES
--   `businesses` and `business_departments` are both mutable — businesses are
--   created, paused, and archived; departments are configured and re-configured
--   over time. Each table gets SELECT + INSERT + UPDATE + DELETE policies, all
--   tenant-scoped.
--
-- PER-BUSINESS ISOLATION
--   These policies enforce TENANT isolation. Business-level isolation is layered
--   on top by always filtering `business_id` in application queries: tenant RLS
--   (here) + the `business_id` column (0005) together give per-business
--   isolation, so one business never reads or writes another's rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Business Template tables (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table businesses            enable row level security;
alter table business_departments  enable row level security;

-- =============================================================================
-- businesses — mutable: businesses are created, renamed, paused, and archived.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy businesses_select on businesses
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy businesses_insert on businesses
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy businesses_update on businesses
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy businesses_delete on businesses
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- business_departments — mutable: departments are instantiated and reconfigured
-- as each business is set up. select/insert/update/delete, all tenant-scoped.
-- Business-level isolation comes from filtering business_id in app queries.
-- =============================================================================
create policy business_departments_select on business_departments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy business_departments_insert on business_departments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy business_departments_update on business_departments
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy business_departments_delete on business_departments
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
