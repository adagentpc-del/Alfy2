-- =============================================================================
-- Migration: 0051_ingested_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Knowledge Ingestion Engine
--            `ingested_items` table with a DENY-BY-DEFAULT posture, then add
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
-- Enable RLS on the ingested_items table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table ingested_items enable row level security;

-- =============================================================================
-- ingested_items — mutable: items are ingested, reprocessed, re-linked, and
-- removed over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy ingested_items_select on ingested_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ingested_items_insert on ingested_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ingested_items_update on ingested_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ingested_items_delete on ingested_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
