-- =============================================================================
-- Migration: 0088_idea_dispositions_rls.sql
-- Purpose:   Enable Row-Level Security on the Idea Disposition capture
--            `idea_dispositions` table with a DENY-BY-DEFAULT posture, then add
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
--
-- IMMUTABLE CAPTURE RECORDS
--   `idea_dispositions` rows are recorded moments of decision. They get
--   SELECT + INSERT + DELETE policies ONLY. The deliberate ABSENCE of an UPDATE
--   policy, combined with deny-by-default, makes every existing disposition
--   immutable — a capture row can be discarded but never rewritten in place.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the idea_dispositions table (deny-by-default until policies are
-- added).
-- -----------------------------------------------------------------------------
alter table idea_dispositions enable row level security;

-- =============================================================================
-- idea_dispositions — capture records: read/append within the tenant, and
-- discard (DELETE) to remove a captured idea. No UPDATE policy on purpose:
-- deny-by-default then makes every existing disposition immutable.
-- select/insert/delete, all tenant-scoped.
-- =============================================================================
create policy idea_dispositions_select on idea_dispositions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy idea_dispositions_insert on idea_dispositions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy idea_dispositions_delete on idea_dispositions
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
