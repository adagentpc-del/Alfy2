-- =============================================================================
-- Migration: 0045_control_tower_snapshots_rls.sql
-- Purpose:   Enable Row-Level Security on the Executive Control Tower
--            `control_tower_snapshots` table with a DENY-BY-DEFAULT posture,
--            then add tenant-isolation policies. Mirrors the tenancy model from
--            0002 and the append-only treatment of events/audit_log.
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
-- APPEND-ONLY (IMMUTABLE SNAPSHOTS)
--   `control_tower_snapshots` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   existing snapshot rows immutable — no caller can mutate or remove them. A
--   snapshot is a point-in-time record; new state means a new snapshot, never an
--   edit. (Mirrors the events/audit_log treatment in 0002, SECURITY.md §4.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the control_tower_snapshots table (deny-by-default until
-- policies are added).
-- -----------------------------------------------------------------------------
alter table control_tower_snapshots enable row level security;

-- =============================================================================
-- control_tower_snapshots — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing snapshot row immutable. Snapshots are point-in-time records.
-- =============================================================================
create policy control_tower_snapshots_select on control_tower_snapshots
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy control_tower_snapshots_insert on control_tower_snapshots
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
