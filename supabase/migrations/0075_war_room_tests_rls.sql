-- =============================================================================
-- Migration: 0075_war_room_tests_rls.sql
-- Purpose:   Enable Row-Level Security on the Conversion War Room
--            `war_room_tests` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0025.
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
-- Enable RLS on war_room_tests (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table war_room_tests enable row level security;

-- =============================================================================
-- war_room_tests — mutable: tests are created, run, scored, and resolved to a
-- winner over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy war_room_tests_select on war_room_tests
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy war_room_tests_insert on war_room_tests
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy war_room_tests_update on war_room_tests
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy war_room_tests_delete on war_room_tests
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
