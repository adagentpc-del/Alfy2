-- =============================================================================
-- Migration: 0009_founder_intelligence_rls.sql
-- Purpose:   Enable Row-Level Security on the Founder Intelligence System (FIS)
--            tables with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Implements SECURITY.md §2 (tenancy). Companion to
--            0008_founder_intelligence.sql.
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
--   `billing_accounts`, `grants`, and `knowledge_docs` are all mutable — a
--   billing account is provisioned and metered; grants are added and revoked;
--   knowledge docs are authored and edited. Each table gets SELECT + INSERT +
--   UPDATE + DELETE policies, all tenant-scoped.
--
-- NOTE
--   The `tenants` table already has RLS + policies from 0002; 0008 only added
--   columns to it. This migration does NOT touch tenants RLS.
--
-- PER-BUSINESS ISOLATION
--   These policies enforce TENANT isolation. For knowledge_docs scoped to a
--   single business, business-level isolation is layered on top by filtering
--   `business_id` in application queries: tenant RLS (here) + the `business_id`
--   column (0008) together give per-business isolation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the FIS tables (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table billing_accounts  enable row level security;
alter table grants            enable row level security;
alter table knowledge_docs    enable row level security;

-- =============================================================================
-- billing_accounts — mutable: provisioned, metered, and lifecycle-updated.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy billing_accounts_select on billing_accounts
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy billing_accounts_insert on billing_accounts
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy billing_accounts_update on billing_accounts
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy billing_accounts_delete on billing_accounts
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- grants — mutable: role grants are added and revoked over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy grants_select on grants
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy grants_insert on grants
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy grants_update on grants
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy grants_delete on grants
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- knowledge_docs — mutable: documents are authored, edited, and removed.
-- select/insert/update/delete, all tenant-scoped. Business-level isolation
-- comes from filtering business_id in app queries.
-- =============================================================================
create policy knowledge_docs_select on knowledge_docs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_docs_insert on knowledge_docs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_docs_update on knowledge_docs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_docs_delete on knowledge_docs
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
