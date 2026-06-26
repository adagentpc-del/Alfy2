-- =============================================================================
-- Migration: 0008_founder_intelligence.sql
-- Purpose:   Productize Alfy² into the Founder Intelligence System (FIS) —
--            a multi-tenant SaaS — by making BILLING, PERMISSIONS, and a
--            tenant KNOWLEDGE BASE first-class. Extends the existing `tenants`
--            table (0001) into an FIS account with a slug and plan.
--
-- TENANT-FIRST FROM DAY ONE
--   The platform was tenant-scoped from the start: memory, businesses, agents,
--   dashboards, and automation all already carry `tenant_id` and ride on the
--   uniform RLS posture (0002/0006). Productization does NOT retrofit tenancy —
--   it only promotes three concerns that were previously implicit into explicit,
--   first-class tables: billing (billing_accounts), permissions (grants), and
--   the tenant knowledge base (knowledge_docs). Everything stays tenant-scoped.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0009_founder_intelligence_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (alter ... if not exists, create table/index if
-- not exists, named constraint added only if absent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extend the existing `tenants` table (0001) into an FIS account.
--   - slug: optional human-friendly handle for the account.
--   - plan: subscription tier; defaults to 'solo' for existing single-operator
--     tenants. Constrained to the supported FIS plan ladder.
-- -----------------------------------------------------------------------------
alter table tenants add column if not exists slug text;
alter table tenants add column if not exists plan text not null default 'solo';

-- Named CHECK on tenants.plan, added only if it does not already exist so the
-- migration is safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_plan_check'
  ) then
    alter table tenants
      add constraint tenants_plan_check
      check (plan in ('free','solo','team','scale','enterprise'));
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- billing_accounts — one billing account per tenant. Mutable.
-- Tracks the subscription plan, lifecycle status, seat count, billing period,
-- and rolling AI usage counters used for budgets and metering.
-- -----------------------------------------------------------------------------
create table if not exists billing_accounts (
  id                  uuid          primary key default gen_random_uuid(),
  tenant_id           uuid          not null,
  plan                text          not null
                                    check (plan in ('free','solo','team','scale','enterprise')),
  status              text          not null default 'trialing'
                                    check (status in ('active','trialing','past_due','cancelled')),
  seats               integer       not null default 1 check (seats > 0),
  current_period_end  timestamptz,
  usage_ai_calls      integer       not null default 0,
  usage_cost_usd      numeric(12,6) not null default 0,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz,
  unique (tenant_id)
);

-- -----------------------------------------------------------------------------
-- grants — role grants for principals within a tenant. Permissions made
-- first-class. A principal (user/key/service identity) holds one or more roles
-- within the tenant. Mutable (grants are added/revoked over time).
-- -----------------------------------------------------------------------------
create table if not exists grants (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  principal   text        not null,
  role        text        not null check (role in ('owner','admin','member','viewer')),
  created_at  timestamptz not null default now(),
  unique (tenant_id, principal, role)
);

create index if not exists grants_tenant_principal_idx on grants (tenant_id, principal);

-- -----------------------------------------------------------------------------
-- knowledge_docs — tenant knowledge base. Distinct from per-entity `memory`
-- (0001): memory is operator profile/context keyed by kind/key; knowledge_docs
-- are authored documents (title + body + tags) searchable across the tenant or
-- scoped to a single business. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists knowledge_docs (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null,
  title        text        not null,
  body         text        not null default '',
  tags         text[]      not null default '{}',
  visibility   text        not null default 'tenant'
                           check (visibility in ('tenant','business')),
  business_id  uuid,
  search_tsv   tsvector    generated always as (
                 to_tsvector(
                   'english',
                   coalesce(title, '') || ' ' ||
                   coalesce(body, '')  || ' ' ||
                   array_to_string(tags, ' ')
                 )
               ) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create index if not exists knowledge_docs_search_idx
  on knowledge_docs using gin (search_tsv);

create index if not exists knowledge_docs_tenant_visibility_idx
  on knowledge_docs (tenant_id, visibility);

-- -----------------------------------------------------------------------------
-- updated_at triggers for the mutable FIS tables. Reuses set_updated_at() from
-- 0001 (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_billing_accounts on billing_accounts;
create trigger set_updated_at_billing_accounts
  before update on billing_accounts
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_knowledge_docs on knowledge_docs;
create trigger set_updated_at_knowledge_docs
  before update on knowledge_docs
  for each row execute function set_updated_at();
