-- =============================================================================
-- Migration: 0011_executive_inbox_rls.sql
-- Purpose:   Enable Row-Level Security on the Executive Inbox table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy).
--            Companion to 0010_executive_inbox.sql.
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
-- MUTABLE TABLES
--   `inbox_items` is mutable — items are triaged, reviewed, actioned, and
--   archived as the executive works the inbox. The table gets
--   SELECT + INSERT + UPDATE + DELETE policies, all tenant-scoped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Executive Inbox table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table inbox_items enable row level security;

-- =============================================================================
-- inbox_items — mutable: dropped content is classified, reviewed, actioned, and
-- archived over its lifetime. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy inbox_items_select on inbox_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy inbox_items_insert on inbox_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy inbox_items_update on inbox_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy inbox_items_delete on inbox_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
