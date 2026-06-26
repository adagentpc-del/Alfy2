-- =============================================================================
-- Migration: 0040_agent_identities.sql
-- Purpose:   Stand up the Alfy² Agent Identity & Zero Trust feature — a single
--            `agent_identities` table that gives every agent a unique, scoped,
--            revocable identity on top of the tenant-scoped platform.
--
-- AGENT IDENTITY & ZERO TRUST MODEL
--   - Every agent has a UNIQUE identity per tenant, keyed by `agent_key`
--     (unique (tenant_id, agent_key)). An identity is SCOPED (what data,
--     tools, and actions it may touch) and REVOCABLE (status can flip to
--     'suspended' or 'revoked' at any time).
--   - DENY-BY-DEFAULT / READ-ONLY: a fresh identity can do NOTHING dangerous.
--       * capabilities default false — no money (can_spend), no external
--         messages (can_external_comm), no production changes
--         (can_modify_production), no deletion (can_delete), no writes
--         (can_write).
--       * spending_limit_usd defaults to 0 (no money may move).
--       * external_comm_daily_limit defaults to 0 (no external messages).
--     Capability is granted ONLY by explicitly flipping a flag and/or raising a
--     limit — nothing is implied.
--   - `scope`, `data_boundaries`, and `tool_access` enumerate exactly what the
--     identity is allowed to reach; an empty list ('[]') grants nothing.
--   - `requires_approval_for` lists the action classes that always demand a
--     human approval gate before the agent may proceed, even when otherwise
--     capable (spend_money, delete_data, modify_production, contact_external,
--     sign_contract, install_package).
--   - `role` labels the identity (default 'worker'); `status` carries the
--     lifecycle: active → suspended → revoked.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0041_agent_identities_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- agent_identities — a unique, scoped, revocable identity for an agent. Carries
-- its capabilities (all deny-by-default), scope, data boundaries, tool access,
-- spending/communication limits, the action classes that always require an
-- approval gate, and a status lifecycle (active → suspended → revoked). An
-- identity starts read-only — no money, no external messages, no production, no
-- deletion — until each capability is explicitly granted. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists agent_identities (
  id                          uuid              primary key default gen_random_uuid(),
  tenant_id                   uuid              not null,
  agent_key                   text              not null,
  display_name                text              not null,
  role                        text              not null default 'worker',
  scope                       jsonb             not null default '[]'::jsonb,
  capabilities                jsonb             not null default '{}'::jsonb,
  data_boundaries             jsonb             not null default '[]'::jsonb,
  tool_access                 jsonb             not null default '[]'::jsonb,
  spending_limit_usd          double precision  not null default 0,
  external_comm_daily_limit   integer           not null default 0,
  requires_approval_for       jsonb             not null default
                                                '["spend_money","delete_data","modify_production","contact_external","sign_contract","install_package"]'::jsonb,
  status                      text              not null default 'active'
                                                check (status in ('active','suspended','revoked')),
  created_at                  timestamptz       not null default now(),
  updated_at                  timestamptz,
  unique (tenant_id, agent_key)
);

create index if not exists agent_identities_tenant_status_idx
  on agent_identities (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for agent_identities. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_agent_identities on agent_identities;
create trigger set_updated_at_agent_identities
  before update on agent_identities
  for each row execute function set_updated_at();
