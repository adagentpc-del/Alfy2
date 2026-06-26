-- =============================================================================
-- Migration: 0005_business.sql
-- Purpose:   Create the Alfy² Business Template tables — the multi-business
--            framework. A `business` is an instantiated copy of the Business
--            Template with its own departments. Implements the Business Template
--            (per-business data isolation layered on top of tenant isolation).
--
-- DATA ISOLATION
--   Every business row carries the usual `tenant_id` for tenant-level RLS, plus
--   its own `id` which IS the business_id. Department rows additionally carry a
--   `business_id` foreign key. Per-business isolation is achieved by combining
--   tenant RLS (0006_business_rls.sql) with a `business_id` column that
--   application queries always filter on. A `data_namespace` token on each
--   business gives callers a stable isolation handle for storage/keys.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0006_business_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- businesses — one instantiated business per row. The row's `id` IS the
-- business_id used to scope departments and all per-business data. Mutable:
-- name/status/template_version evolve over the business's life.
-- -----------------------------------------------------------------------------
create table if not exists businesses (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  name             text        not null,
  slug             text        not null
                               check (slug ~ '^[a-z][a-z0-9-]*$'),
  data_namespace   text        not null,
  template_version text        not null,
  status           text        not null default 'active'
                               check (status in ('active','paused','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  unique (tenant_id, slug)
);

-- -----------------------------------------------------------------------------
-- business_departments — the instantiated departments per business. Exactly one
-- department of each `kind` per business. Mutable: mission/responsibilities/
-- capabilities/kpis and status evolve as the business is configured.
--
-- PER-BUSINESS DATA ISOLATION: isolation is enforced by the `business_id` column
-- (FK → businesses.id) combined with tenant RLS from 0006_business_rls.sql.
-- Tenant RLS scopes rows to the tenant; application queries always filter on
-- `business_id` so one business never sees another business's departments.
-- -----------------------------------------------------------------------------
create table if not exists business_departments (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  business_id      uuid        not null references businesses(id) on delete cascade,
  kind             text        not null
                               check (kind in (
                                 'ceo','operations','sales','marketing','finance',
                                 'legal','customer_success','projects','product',
                                 'analytics','deployment','automation'
                               )),
  name             text        not null,
  mission          text        not null,
  responsibilities jsonb       not null default '[]'::jsonb,
  capabilities     jsonb       not null default '[]'::jsonb,
  default_agents   jsonb       not null default '[]'::jsonb,
  memory_scope     jsonb       not null default '{}'::jsonb,
  kpis             jsonb       not null default '[]'::jsonb,
  dashboard_card   jsonb       not null default '{}'::jsonb,
  status           text        not null default 'active'
                               check (status in ('active','paused')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  unique (tenant_id, business_id, kind)
);

create index if not exists business_departments_tenant_business_idx
                                                on business_departments (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers for the mutable tables. Reuses the shared set_updated_at()
-- function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_businesses on businesses;
create trigger set_updated_at_businesses
  before update on businesses
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_business_departments on business_departments;
create trigger set_updated_at_business_departments
  before update on business_departments
  for each row execute function set_updated_at();
