-- =============================================================================
-- Migration: 0128_guest_records_rls.sql
-- Purpose:   Enable Row-Level Security on the Podcast Guest Booking
--            `guest_records` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- Enable RLS on the guest_records table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table guest_records enable row level security;

-- =============================================================================
-- guest_records — mutable: candidates are ranked, approved, contacted, tracked
-- through replies, scheduled, and recorded over time. select/insert/update/
-- delete, all tenant-scoped.
-- =============================================================================
create policy guest_records_select on guest_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy guest_records_insert on guest_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy guest_records_update on guest_records
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy guest_records_delete on guest_records
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
