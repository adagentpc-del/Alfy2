-- =============================================================================
-- Migration: 0018_enterprise_security.sql
-- Purpose:   Stand up the Alfy² Enterprise Security layer — least privilege,
--            audit-everything, and a secret vault that holds REFERENCES, never
--            values. Implements SECURITY.md (enterprise hardening) on top of the
--            existing tenant-scoped platform.
--
-- SECURITY MODEL
--   - Least privilege: principals act only within their granted role; sensitive
--     actions fall into one of six ALWAYS-APPROVE action classes
--     (spend_money, delete_data, modify_production, contact_external,
--     sign_contract, install_package) and route through approval_requests.
--   - Audit everything: every evaluated action is recorded in security_audit
--     with its actor, decision (allow/deny/requires_approval) and outcome.
--   - Secret vault stores references: `secrets` rows point into the encrypted
--     store / KMS via `location` and NEVER hold the secret value.
--
-- HARD GUARANTEES
--   - security_audit is APPEND-ONLY. It has no updated_at, and 0019 grants it
--     INSERT + SELECT only — the deliberate absence of UPDATE/DELETE policies
--     (under deny-by-default) makes every audit row immutable, exactly like
--     `events` and `audit_log` in 0001/0002.
--   - secrets.value_stored carries a CHECK (value_stored = false): the column
--     can only ever be false, a schema-level guarantee that the vault never
--     stores a secret value alongside its reference.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0019_enterprise_security_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- security_audit — APPEND-ONLY audit trail of every evaluated action.
-- Captures who acted, whether it was an agent, what was attempted, the action
-- class (one of the six always-approve classes, or NULL for ordinary actions),
-- the target environment, the policy decision, and the resulting outcome.
-- No updated_at: audit rows are immutable (enforced in 0019).
-- -----------------------------------------------------------------------------
create table if not exists security_audit (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  at            timestamptz not null default now(),
  actor         text        not null,
  is_agent      boolean     not null default false,
  action        text        not null,
  action_class  text        check (action_class in (
                              'spend_money','delete_data','modify_production',
                              'contact_external','sign_contract','install_package')),
  resource      text        not null default '',
  target_env    text        not null default 'dev'
                            check (target_env in ('dev','staging','production')),
  decision      text        not null
                            check (decision in ('allow','deny','requires_approval')),
  outcome       text        not null default 'evaluated'
                            check (outcome in ('evaluated','executed','blocked','queued')),
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists security_audit_tenant_at_idx
  on security_audit (tenant_id, at);

create index if not exists security_audit_tenant_actor_idx
  on security_audit (tenant_id, actor);

create index if not exists security_audit_tenant_action_class_idx
  on security_audit (tenant_id, action_class);

-- -----------------------------------------------------------------------------
-- approval_requests — pending/resolved gates for always-approve actions.
-- A sensitive action (an action_class) is queued here for a principal holding
-- the required role to approve or reject. Mutable (resolved over time).
-- -----------------------------------------------------------------------------
create table if not exists approval_requests (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  requested_by  text        not null,
  action        text        not null,
  action_class  text        check (action_class in (
                              'spend_money','delete_data','modify_production',
                              'contact_external','sign_contract','install_package')),
  resource      text        not null default '',
  reason        text        not null default '',
  status        text        not null default 'pending'
                            check (status in ('pending','approved','rejected','expired')),
  required_role text        not null default 'owner'
                            check (required_role in ('owner','admin','member','viewer')),
  resolved_at   timestamptz,
  resolved_by   text,
  audit_id      uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index if not exists approval_requests_tenant_status_idx
  on approval_requests (tenant_id, status);

-- -----------------------------------------------------------------------------
-- permission_groups — named bundles of permissions and their members. Least
-- privilege made reusable: a group carries a permission set and a member list,
-- both as JSON arrays. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists permission_groups (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null,
  name         text        not null,
  permissions  jsonb       not null default '[]'::jsonb,
  members      jsonb       not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  unique (tenant_id, name)
);

-- -----------------------------------------------------------------------------
-- secrets — vault REFERENCES, never values. Each row points (via `location`)
-- into the encrypted store / KMS and tracks rotation lifecycle. The
-- value_stored CHECK (= false) guarantees, at the schema level, that this table
-- never holds the secret value itself. Mutable (rotation/status change over time).
-- -----------------------------------------------------------------------------
create table if not exists secrets (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  name                  text        not null,
  kind                  text        not null
                                    check (kind in ('api_key','password','token','oauth','certificate','ssh_key')),
  location              text        not null,
  owner                 text        not null,
  status                text        not null default 'active'
                                    check (status in ('active','rotating','revoked')),
  rotation_period_days  integer     not null default 90 check (rotation_period_days > 0),
  last_rotated_at       timestamptz,
  next_rotation_at      timestamptz,
  value_stored          boolean     not null default false check (value_stored = false),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  unique (tenant_id, name)
);

create index if not exists secrets_tenant_next_rotation_idx
  on secrets (tenant_id, next_rotation_at);

-- -----------------------------------------------------------------------------
-- sessions — active principal sessions with expiry, scopes, and revocation.
-- Append/scan oriented; not maintained via updated_at (sessions are revoked,
-- not edited, and last_seen_at is set explicitly).
-- -----------------------------------------------------------------------------
create table if not exists sessions (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  principal     text        not null,
  expires_at    timestamptz not null,
  last_seen_at  timestamptz,
  revoked       boolean     not null default false,
  ip            text,
  scopes        jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists sessions_tenant_principal_idx
  on sessions (tenant_id, principal);

create index if not exists sessions_tenant_revoked_idx
  on sessions (tenant_id, revoked);

-- -----------------------------------------------------------------------------
-- updated_at triggers for the mutable enterprise-security tables. Reuses
-- set_updated_at() from 0001 (do NOT redefine the function here).
-- security_audit and sessions are intentionally excluded (no updated_at).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_approval_requests on approval_requests;
create trigger set_updated_at_approval_requests
  before update on approval_requests
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_permission_groups on permission_groups;
create trigger set_updated_at_permission_groups
  before update on permission_groups
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_secrets on secrets;
create trigger set_updated_at_secrets
  before update on secrets
  for each row execute function set_updated_at();
