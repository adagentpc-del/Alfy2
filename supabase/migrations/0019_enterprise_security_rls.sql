-- =============================================================================
-- Migration: 0019_enterprise_security_rls.sql
-- Purpose:   Enable Row-Level Security on every Enterprise Security table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements SECURITY.md (enterprise hardening) on top of the tenancy
--            model from 0002. Mirrors the append-only treatment of `events` and
--            `audit_log` for the immutable `security_audit` trail.
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
-- APPEND-ONLY TABLES
--   `security_audit` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing audit row immutable — no caller can mutate or remove it, exactly
--   like `events` and `audit_log` (0002). This is the hard guarantee behind the
--   audit-everything posture. (SECURITY.md)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on every enterprise-security table (deny-by-default until policies
-- are added).
-- -----------------------------------------------------------------------------
alter table security_audit     enable row level security;
alter table approval_requests  enable row level security;
alter table permission_groups  enable row level security;
alter table secrets            enable row level security;
alter table sessions           enable row level security;

-- =============================================================================
-- security_audit — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing audit row immutable. (SECURITY.md — audit everything)
-- =============================================================================
create policy security_audit_select on security_audit
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy security_audit_insert on security_audit
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- approval_requests — mutable: gates are resolved (pending → approved/rejected/
-- expired). select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy approval_requests_select on approval_requests
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approval_requests_insert on approval_requests
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approval_requests_update on approval_requests
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approval_requests_delete on approval_requests
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- permission_groups — mutable: groups, their permissions, and members change
-- over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy permission_groups_select on permission_groups
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy permission_groups_insert on permission_groups
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy permission_groups_update on permission_groups
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy permission_groups_delete on permission_groups
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- secrets — mutable: vault references are rotated, revoked, and retired over
-- time. select/insert/update/delete, all tenant-scoped. (Rows hold references
-- only — never values — per the value_stored CHECK in 0018.)
-- =============================================================================
create policy secrets_select on secrets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy secrets_insert on secrets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy secrets_update on secrets
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy secrets_delete on secrets
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- sessions — mutable: sessions are seen, revoked, and pruned over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy sessions_select on sessions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sessions_insert on sessions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sessions_update on sessions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sessions_delete on sessions
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
