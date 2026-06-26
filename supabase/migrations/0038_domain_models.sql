-- =============================================================================
-- Migration: 0038_domain_models.sql
-- Purpose:   Stand up the Alfy² Domain Operating Models feature — a single
--            `domain_models` table. Instead of automating single tasks, the
--            operator redesigns FULL domains: each of the 11 domains gets its
--            own goals, workflows, agents, KPIs, assets, approvals, dashboards,
--            and escalation rules.
--
-- DOMAIN OPERATING MODELS
--   - Eleven domains span the operator's surface:
--       sales, marketing, finance, operations, legal_risk, customer_success,
--       product, recruiting, personal_admin, health, asset_management.
--   - Each domain is an OPERATING MODEL, not a one-off automation. A model
--     carries the full design of how that domain runs:
--       goals, workflows, agents, kpis, assets, approvals, dashboards, and
--       escalation_rules — each a jsonb collection.
--   - A model is versioned by `template_version` so the operating-model
--     template it was instantiated from can be tracked and upgraded.
--   - One operating model per domain per tenant (enforced by a unique
--     constraint on (tenant_id, domain)).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0039_domain_models_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- domain_models — the operating model for one of the operator's 11 domains.
-- Rather than automating single tasks, the model redesigns the full domain:
-- it carries the domain's goals, workflows, agents, KPIs, assets, approvals,
-- dashboards, and escalation rules. One operating model per domain per tenant.
-- `template_version` tracks the operating-model template it derives from.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists domain_models (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  domain            text        not null
                                check (domain in (
                                  'sales','marketing','finance','operations',
                                  'legal_risk','customer_success','product',
                                  'recruiting','personal_admin','health',
                                  'asset_management')),
  name              text        not null,
  goals             jsonb       not null default '[]'::jsonb,
  workflows         jsonb       not null default '[]'::jsonb,
  agents            jsonb       not null default '[]'::jsonb,
  kpis              jsonb       not null default '[]'::jsonb,
  assets            jsonb       not null default '[]'::jsonb,
  approvals         jsonb       not null default '[]'::jsonb,
  dashboards        jsonb       not null default '[]'::jsonb,
  escalation_rules  jsonb       not null default '[]'::jsonb,
  template_version  text        not null default '1.0.0',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  unique (tenant_id, domain)
);

create index if not exists domain_models_tenant_domain_idx
  on domain_models (tenant_id, domain);

-- -----------------------------------------------------------------------------
-- updated_at trigger for domain_models. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_domain_models on domain_models;
create trigger set_updated_at_domain_models
  before update on domain_models
  for each row execute function set_updated_at();
