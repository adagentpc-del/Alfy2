-- =============================================================================
-- Migration: 0161_leverage_comparisons_rls.sql
-- Purpose:   Enable Row-Level Security on the Leverage Engine
--            `leverage_comparisons` table with a DENY-BY-DEFAULT posture, then
--            add tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- APPEND-ONLY / IMMUTABLE
--   `leverage_comparisons` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing comparison immutable — no caller can mutate or remove it.
--   This matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on leverage_comparisons (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table leverage_comparisons enable row level security;

-- =============================================================================
-- leverage_comparisons — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing comparison immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy leverage_comparisons_select on leverage_comparisons
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy leverage_comparisons_insert on leverage_comparisons
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
