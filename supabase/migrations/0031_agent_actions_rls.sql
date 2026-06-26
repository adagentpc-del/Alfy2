-- =============================================================================
-- Migration: 0031_agent_actions_rls.sql
-- Purpose:   Enable Row-Level Security on the Agent Observability table with a
--            DENY-BY-DEFAULT posture, then add a tenant-isolation policy.
--            Implements the append-only provenance log from 0030. Mirrors the
--            append-only treatment of `security_audit` (0019) and `events`/
--            `audit_log` (0002) for the immutable `agent_actions` trail.
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
--   the specific policies this table needs. Anything not granted stays denied.
--
-- APPEND-ONLY TABLE
--   `agent_actions` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing action row immutable — no caller can mutate or remove it, exactly
--   like `security_audit` (0019) and `events`/`audit_log` (0002). This is the
--   hard guarantee behind the agent-observability provenance log.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the agent-observability table (deny-by-default until policies
-- are added).
-- -----------------------------------------------------------------------------
alter table agent_actions enable row level security;

-- =============================================================================
-- agent_actions — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing action row immutable. (Agent Observability provenance log)
-- =============================================================================
create policy agent_actions_select on agent_actions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_actions_insert on agent_actions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
