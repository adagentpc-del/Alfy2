-- =============================================================================
-- Migration: 0012_connectors.sql
-- Purpose:   Persist the Alfy² Connector Registry — the durable form of each
--            ConnectorDescriptor. A connector is any integration the platform
--            can talk to (GitHub, Gmail, Stripe, an MCP server, …) together with
--            its auth method, permission surface, risk posture, allowed actions,
--            and live health.
--
-- INTEGRATIONS ARE MODULAR, NOT HARD-CODED
--   The registry is data, not code. New connectors are onboarded by inserting
--   rows, never by shipping a migration. To make that real, the two descriptive
--   axes — `kind` ('github', 'gmail', 'stripe', 'mcp', …) and `category` — are
--   FREE TEXT, deliberately NOT CHECK-constrained enums. A future connector of a
--   kind nobody has imagined yet must work the day it is added, with zero schema
--   change. Only the columns that gate SAFETY (authentication, risk_level,
--   health_status) carry CHECK constraints, because those are fixed contracts
--   the platform reasons about; the taxonomy of integrations is open-ended.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0013_connectors_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- connectors — the persisted ConnectorDescriptor. One row per connector per
-- tenant, keyed by its descriptor id (connector_key, e.g. 'github-a3'). Mutable:
-- connectors are enabled/disabled, re-permissioned, and continuously re-synced,
-- so health and last_sync drift over time.
-- -----------------------------------------------------------------------------
create table if not exists connectors (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  connector_key    text        not null,
  name             text        not null,
  kind             text        not null,
  category         text        not null default '',
  authentication   text        not null
                               check (authentication in ('oauth2','api_key','token','none','mcp')),
  permissions      jsonb       not null default '[]'::jsonb,
  risk_level       text        not null
                               check (risk_level in ('low','medium','high')),
  allowed_actions  jsonb       not null default '[]'::jsonb,
  businesses_using jsonb       not null default '[]'::jsonb,
  health_status    text        not null default 'unknown'
                               check (health_status in ('healthy','degraded','down','unknown')),
  last_sync        timestamptz,
  enabled          boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  unique (tenant_id, connector_key)
);

create index if not exists connectors_tenant_kind_idx
  on connectors (tenant_id, kind);

create index if not exists connectors_tenant_health_status_idx
  on connectors (tenant_id, health_status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for the mutable connectors table. Reuses set_updated_at()
-- from 0001 (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_connectors on connectors;
create trigger set_updated_at_connectors
  before update on connectors
  for each row execute function set_updated_at();
