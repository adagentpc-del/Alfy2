-- =============================================================================
-- Alfy2 — ALL MIGRATIONS, combined in order (generated 2026-06-26T11:18Z).
-- Paste this whole file into the Supabase SQL Editor and press RUN to stand up
-- the entire schema on a fresh project. Migrations are ordered + idempotent
-- (create ... if not exists), so a single run applies them all.
-- =============================================================================

-- >>>>> 0001_platform_core.sql >>>>>
-- =============================================================================
-- Migration: 0001_platform_core.sql
-- Purpose:   Create the Alfy² platform tables (no business/domain rows).
--            Implements TECH_SPEC.md §5 (data model) and SECURITY.md §2/§4.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by a shared trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0002_rls_policies.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create extension/table if not exists).
-- =============================================================================

-- gen_random_uuid() is provided by pgcrypto.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger function.
-- Attached only to mutable tables (module_registry, agent_registry, approvals,
-- memory). Keeps updated_at in sync on every UPDATE.
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- tenants — tenant root. One row in single-operator mode.
-- tenant_id references its own id (set in the seed) to keep RLS uniform across
-- every platform table.
-- -----------------------------------------------------------------------------
create table if not exists tenants (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  name        text        not null,
  status      text        not null default 'active',
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- module_registry — installed modules + their manifest. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists module_registry (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  module_id   text        not null,
  version     text        not null,
  manifest    jsonb       not null,
  enabled     boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (tenant_id, module_id)
);

-- -----------------------------------------------------------------------------
-- agent_registry — installed agents + endpoints. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists agent_registry (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  agent_key     text        not null,
  runtime       text        not null check (runtime in ('python','typescript')),
  endpoint      text        not null,
  version       text        not null,
  registration  jsonb       not null,
  enabled       boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (tenant_id, agent_key)
);

-- -----------------------------------------------------------------------------
-- events — append-only event log (immutable). Correlated by trace_id.
-- Immutability is enforced in 0002 via deny-by-default + no UPDATE/DELETE policy.
-- -----------------------------------------------------------------------------
create table if not exists events (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  trace_id    uuid        not null,
  event_type  text        not null,
  payload     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists events_tenant_trace_idx on events (tenant_id, trace_id);
create index if not exists events_tenant_type_idx  on events (tenant_id, event_type);

-- -----------------------------------------------------------------------------
-- decisions — planner choices + rationale. FK → events.
-- -----------------------------------------------------------------------------
create table if not exists decisions (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  event_id    uuid        references events(id),
  trace_id    uuid        not null,
  rationale   text        not null,
  plan        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- approvals — pending/resolved approval gates. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists approvals (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  trace_id        uuid,
  action_label    text        not null,
  action_payload  jsonb       not null default '{}'::jsonb,
  status          text        not null default 'pending'
                              check (status in ('pending','approved','rejected')),
  resolved_at     timestamptz,
  resolved_by     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- -----------------------------------------------------------------------------
-- memory — operator profile/context. Mutable, audited writes.
-- -----------------------------------------------------------------------------
create table if not exists memory (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  kind        text        not null,
  key         text        not null,
  value       jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (tenant_id, kind, key)
);

-- -----------------------------------------------------------------------------
-- ai_cache — content-hash → cached AI output, with TTL.
-- -----------------------------------------------------------------------------
create table if not exists ai_cache (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  content_hash  text        not null,
  model         text        not null,
  output        jsonb       not null,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (tenant_id, content_hash)
);

-- -----------------------------------------------------------------------------
-- ai_usage — per-call tokens/cost/model, for budgets & reporting.
-- -----------------------------------------------------------------------------
create table if not exists ai_usage (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  trace_id           uuid,
  model              text          not null,
  prompt_tokens      integer       not null default 0,
  completion_tokens  integer       not null default 0,
  cost_usd           numeric(12,6) not null default 0,
  created_at         timestamptz   not null default now()
);

-- -----------------------------------------------------------------------------
-- audit_log — append-only security-relevant actions (who/what/when).
-- Immutability is enforced in 0002 via deny-by-default + no UPDATE/DELETE policy.
-- -----------------------------------------------------------------------------
create table if not exists audit_log (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  actor       text        not null,
  action      text        not null,
  target      text,
  detail      jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at triggers for the mutable tables.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_module_registry on module_registry;
create trigger set_updated_at_module_registry
  before update on module_registry
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_agent_registry on agent_registry;
create trigger set_updated_at_agent_registry
  before update on agent_registry
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_approvals on approvals;
create trigger set_updated_at_approvals
  before update on approvals
  for each row execute function set_updated_at();

drop trigger if exists set_updated_at_memory on memory;
create trigger set_updated_at_memory
  before update on memory
  for each row execute function set_updated_at();

-- >>>>> 0002_rls_policies.sql >>>>>
-- =============================================================================
-- Migration: 0002_rls_policies.sql
-- Purpose:   Enable Row-Level Security on every platform table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy) and
--            §4 (auditability: events + audit_log are append-only).
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
--   `events` and `audit_log` get INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   existing rows immutable — no caller can mutate or remove them. (SECURITY §4)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on every platform table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table tenants          enable row level security;
alter table module_registry  enable row level security;
alter table agent_registry   enable row level security;
alter table events           enable row level security;
alter table decisions        enable row level security;
alter table approvals        enable row level security;
alter table memory           enable row level security;
alter table ai_cache         enable row level security;
alter table ai_usage         enable row level security;
alter table audit_log        enable row level security;

-- =============================================================================
-- tenants
-- A tenant row is visible/insertable/updatable only when it matches the current
-- tenant context. (id = tenant_id for tenants; we scope on tenant_id uniformly.)
-- =============================================================================
create policy tenants_select on tenants
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenants_insert on tenants
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenants_update on tenants
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tenants_delete on tenants
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- module_registry — mutable: select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy module_registry_select on module_registry
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy module_registry_insert on module_registry
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy module_registry_update on module_registry
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy module_registry_delete on module_registry
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- agent_registry — mutable: select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy agent_registry_select on agent_registry
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_registry_insert on agent_registry
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_registry_update on agent_registry
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_registry_delete on agent_registry
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- events — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing event row immutable. (SECURITY.md §4)
-- =============================================================================
create policy events_select on events
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy events_insert on events
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- decisions — read/append within the tenant. (No update/delete needed: a
-- planner decision is a recorded fact, not edited in place.)
-- =============================================================================
create policy decisions_select on decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy decisions_insert on decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- approvals — mutable: gates are resolved (pending → approved/rejected).
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy approvals_select on approvals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approvals_insert on approvals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approvals_update on approvals
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy approvals_delete on approvals
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- memory — mutable: operator context is upserted/edited over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy memory_select on memory
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_insert on memory
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_update on memory
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_delete on memory
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- ai_cache — read/append cached outputs; entries also expire and can be purged.
-- select/insert/delete, all tenant-scoped. (Cache entries are replaced, not
-- edited, so no UPDATE policy.)
-- =============================================================================
create policy ai_cache_select on ai_cache
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_cache_insert on ai_cache
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_cache_delete on ai_cache
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- ai_usage — read/append usage records within the tenant. (Usage rows are
-- recorded facts; no update/delete.)
-- =============================================================================
create policy ai_usage_select on ai_usage
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_usage_insert on ai_usage
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- audit_log — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing audit row immutable. (SECURITY.md §4)
-- =============================================================================
create policy audit_log_select on audit_log
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audit_log_insert on audit_log
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0003_memory_engine.sql >>>>>
-- =============================================================================
-- Migration: 0003_memory_engine.sql
-- Purpose:   Create the Alfy² Memory Engine tables — the atomic memory record
--            and the typed graph edges between memories. Implements TECH_SPEC.md
--            (Memory Engine: structured, scored, linkable long-term memory that
--            supersedes the flat key/value `memory` table from 0001).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0004_memory_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- memories — the atomic memory record. Mutable: importance/confidence/status and
-- usage stats evolve over the record's life. Each row is one durable fact the
-- engine can recall, score, link, and prune.
-- -----------------------------------------------------------------------------
create table if not exists memories (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  kind          text        not null
                            check (kind in (
                              'business','project','person','company','meeting',
                              'conversation','task','idea','preference','pattern',
                              'vehicle','home','doctor','contract','subscription',
                              'account','health_event','decision','lesson'
                            )),
  title         text        not null,
  body          text        not null default '',
  attributes    jsonb       not null default '{}'::jsonb,
  importance    real        not null default 0.5
                            check (importance >= 0 and importance <= 1),
  confidence    real        not null default 0.6
                            check (confidence >= 0 and confidence <= 1),
  source        text        not null,
  source_ref    text,
  keywords      text[]      not null default '{}',
  status        text        not null default 'active'
                            check (status in ('active','archived','superseded')),
  use_count     integer     not null default 0,
  last_used_at  timestamptz,
  expires_at    timestamptz,
  superseded_by uuid        references memories(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  -- Generated full-text search vector over title + body + keywords.
  search_tsv    tsvector    generated always as (
                  to_tsvector(
                    'english',
                    coalesce(title, '') || ' ' ||
                    coalesce(body, '')  || ' ' ||
                    array_to_string(keywords, ' ')
                  )
                ) stored
);

-- Indexes on memories.
create index if not exists memories_search_tsv_idx     on memories using gin (search_tsv);
create index if not exists memories_keywords_idx       on memories using gin (keywords);
create index if not exists memories_attributes_idx     on memories using gin (attributes);
create index if not exists memories_tenant_kind_idx    on memories (tenant_id, kind);
create index if not exists memories_tenant_importance_idx
                                                       on memories (tenant_id, importance desc);
create index if not exists memories_tenant_last_used_idx
                                                       on memories (tenant_id, last_used_at);
create index if not exists memories_tenant_status_idx  on memories (tenant_id, status);

-- -----------------------------------------------------------------------------
-- memory_links — typed graph edges between memories. Directed: from → to with a
-- relation and a weight. Cascades on delete so edges never dangle.
-- -----------------------------------------------------------------------------
create table if not exists memory_links (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  from_memory_id  uuid        not null references memories(id) on delete cascade,
  to_memory_id    uuid        not null references memories(id) on delete cascade,
  relation        text        not null
                              check (relation in (
                                'related_to','about','derived_from','supersedes',
                                'contradicts','owns','works_at','attended',
                                'member_of','scheduled_for','depends_on','mentions',
                                'located_at','treats','subscribes_to','decided',
                                'learned_from'
                              )),
  weight          real        not null default 1
                              check (weight >= 0 and weight <= 1),
  created_at      timestamptz not null default now(),
  unique (tenant_id, from_memory_id, to_memory_id, relation)
);

create index if not exists memory_links_tenant_from_idx on memory_links (tenant_id, from_memory_id);
create index if not exists memory_links_tenant_to_idx   on memory_links (tenant_id, to_memory_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for memories (the only mutable table here). Reuses the
-- shared set_updated_at() function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_memories on memories;
create trigger set_updated_at_memories
  before update on memories
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- memory_prune_candidates — raw eviction scoring for active memories.
--
-- prune_score = (1 - importance) * (1 - confidence) * (1 / (1 + use_count))
-- i.e. low-importance, low-confidence, rarely-used memories score HIGHEST and
-- surface first. Ordered by prune_score desc.
--
-- This view is ONLY the raw candidate scoring. The Memory Engine applies its own
-- thresholds plus pinned/expiry rules (e.g. honoring expires_at, never evicting
-- pinned or recently-created records) on top of this list before deleting or
-- archiving anything.
--
-- NOTE ON RLS: a view runs with the privileges of its base table(s) and inherits
-- their Row-Level Security. Because `memories` is RLS-scoped per tenant in
-- 0004_memory_rls.sql, this view is automatically tenant-scoped too — so no
-- separate RLS is enabled (or possible) on the view itself.
-- -----------------------------------------------------------------------------
create or replace view memory_prune_candidates as
  select
    id,
    tenant_id,
    kind,
    title,
    importance,
    confidence,
    use_count,
    last_used_at,
    created_at,
    (1 - importance) * (1 - confidence) * (1.0 / (1 + use_count)) as prune_score
  from memories
  where status = 'active'
  order by prune_score desc;

-- >>>>> 0004_memory_rls.sql >>>>>
-- =============================================================================
-- Migration: 0004_memory_rls.sql
-- Purpose:   Enable Row-Level Security on the Memory Engine tables with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy).
--            Companion to 0003_memory_engine.sql.
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
-- MUTABLE TABLES
--   `memories` and `memory_links` are both mutable — records are recalled,
--   re-scored, linked, superseded, and pruned over their lifetime. Each table
--   gets SELECT + INSERT + UPDATE + DELETE policies, all tenant-scoped.
--
-- VIEWS
--   `memory_prune_candidates` (from 0003) inherits RLS from its base table
--   `memories`, so it is NOT enabled here — see the note in 0003_memory_engine.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Memory Engine tables (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table memories      enable row level security;
alter table memory_links  enable row level security;

-- =============================================================================
-- memories — mutable: atomic memory records are recalled, re-scored, superseded,
-- archived, and pruned over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy memories_select on memories
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memories_insert on memories
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memories_update on memories
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memories_delete on memories
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- memory_links — mutable: typed edges are created, re-weighted, and removed as
-- the memory graph evolves. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy memory_links_select on memory_links
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_links_insert on memory_links
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_links_update on memory_links
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy memory_links_delete on memory_links
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0005_business.sql >>>>>
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

-- >>>>> 0006_business_rls.sql >>>>>
-- =============================================================================
-- Migration: 0006_business_rls.sql
-- Purpose:   Enable Row-Level Security on the Business Template tables with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements SECURITY.md §2 (tenancy). Companion to 0005_business.sql.
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
-- MUTABLE TABLES
--   `businesses` and `business_departments` are both mutable — businesses are
--   created, paused, and archived; departments are configured and re-configured
--   over time. Each table gets SELECT + INSERT + UPDATE + DELETE policies, all
--   tenant-scoped.
--
-- PER-BUSINESS ISOLATION
--   These policies enforce TENANT isolation. Business-level isolation is layered
--   on top by always filtering `business_id` in application queries: tenant RLS
--   (here) + the `business_id` column (0005) together give per-business
--   isolation, so one business never reads or writes another's rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Business Template tables (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table businesses            enable row level security;
alter table business_departments  enable row level security;

-- =============================================================================
-- businesses — mutable: businesses are created, renamed, paused, and archived.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy businesses_select on businesses
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy businesses_insert on businesses
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy businesses_update on businesses
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy businesses_delete on businesses
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- business_departments — mutable: departments are instantiated and reconfigured
-- as each business is set up. select/insert/update/delete, all tenant-scoped.
-- Business-level isolation comes from filtering business_id in app queries.
-- =============================================================================
create policy business_departments_select on business_departments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy business_departments_insert on business_departments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy business_departments_update on business_departments
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy business_departments_delete on business_departments
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0007_memory_kinds_personal.sql >>>>>
-- =============================================================================
-- 0007_memory_kinds_personal.sql
-- Extend the memories.kind CHECK to cover the Personal OS life modules that have no
-- existing fit: 'pet' (Pets), 'trip' (Travel), 'goal' (Goals).
-- Additive and non-breaking — existing rows/kinds are unaffected.
-- See docs/PERSONAL_OS.md and packages/shared/src/contracts/memory.ts (canonical kind list).
-- =============================================================================

-- The inline CHECK from 0003_memory_engine.sql is auto-named "memories_kind_check".
alter table memories drop constraint if exists memories_kind_check;

alter table memories
  add constraint memories_kind_check check (
    kind in (
      'business', 'project', 'person', 'company', 'meeting', 'conversation', 'task',
      'idea', 'preference', 'pattern', 'vehicle', 'home', 'doctor', 'contract',
      'subscription', 'account', 'health_event', 'decision', 'lesson',
      'pet', 'trip', 'goal'
    )
  );

-- >>>>> 0008_founder_intelligence.sql >>>>>
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

-- >>>>> 0009_founder_intelligence_rls.sql >>>>>
-- =============================================================================
-- Migration: 0009_founder_intelligence_rls.sql
-- Purpose:   Enable Row-Level Security on the Founder Intelligence System (FIS)
--            tables with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Implements SECURITY.md §2 (tenancy). Companion to
--            0008_founder_intelligence.sql.
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
-- MUTABLE TABLES
--   `billing_accounts`, `grants`, and `knowledge_docs` are all mutable — a
--   billing account is provisioned and metered; grants are added and revoked;
--   knowledge docs are authored and edited. Each table gets SELECT + INSERT +
--   UPDATE + DELETE policies, all tenant-scoped.
--
-- NOTE
--   The `tenants` table already has RLS + policies from 0002; 0008 only added
--   columns to it. This migration does NOT touch tenants RLS.
--
-- PER-BUSINESS ISOLATION
--   These policies enforce TENANT isolation. For knowledge_docs scoped to a
--   single business, business-level isolation is layered on top by filtering
--   `business_id` in application queries: tenant RLS (here) + the `business_id`
--   column (0008) together give per-business isolation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the FIS tables (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table billing_accounts  enable row level security;
alter table grants            enable row level security;
alter table knowledge_docs    enable row level security;

-- =============================================================================
-- billing_accounts — mutable: provisioned, metered, and lifecycle-updated.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy billing_accounts_select on billing_accounts
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy billing_accounts_insert on billing_accounts
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy billing_accounts_update on billing_accounts
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy billing_accounts_delete on billing_accounts
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- grants — mutable: role grants are added and revoked over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy grants_select on grants
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy grants_insert on grants
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy grants_update on grants
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy grants_delete on grants
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- knowledge_docs — mutable: documents are authored, edited, and removed.
-- select/insert/update/delete, all tenant-scoped. Business-level isolation
-- comes from filtering business_id in app queries.
-- =============================================================================
create policy knowledge_docs_select on knowledge_docs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_docs_insert on knowledge_docs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_docs_update on knowledge_docs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_docs_delete on knowledge_docs
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0010_executive_inbox.sql >>>>>
-- =============================================================================
-- Migration: 0010_executive_inbox.sql
-- Purpose:   Create the Alfy² Executive Inbox — the single entry point into the
--            system. Anything the executive drops (a voice note, screenshot,
--            PDF, link, photo, contract, idea, …) lands here, gets processed by
--            the inbox pipeline, and is persisted as an `inbox_items` row: the
--            durable form of a ProcessedInboxItem. From here it fans out into the
--            Memory Engine, dashboards, tasks, and agents.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0011_executive_inbox_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- inbox_items — the persisted form of a ProcessedInboxItem. Mutable: an item is
-- triaged, reviewed, actioned, and archived over its life. Each row is one piece
-- of dropped content together with the pipeline's classification, routing, and
-- the full ProcessedInboxItem payload.
-- -----------------------------------------------------------------------------
create table if not exists inbox_items (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  source             text        not null,
  item_type          text        not null
                                 check (item_type in (
                                   'voice_note','screenshot','pdf','video','photo',
                                   'email','calendar_invite','github_link','url',
                                   'text','todo_list','meeting_notes','idea',
                                   'receipt','contract','invoice','business_card',
                                   'unknown'
                                 )),
  category           text        not null
                                 check (category in (
                                   'business','personal','finance','health',
                                   'learning','relationship','legal','asset',
                                   'technology','opportunity','risk','task',
                                   'project','idea'
                                 )),
  confidence         real        not null default 0
                                 check (confidence >= 0 and confidence <= 1),
  suggested_business text,
  suggested_owner    text        not null,
  urgency            real        not null default 0
                                 check (urgency >= 0 and urgency <= 1),
  urgency_level      text        not null
                                 check (urgency_level in (
                                   'low','medium','high','critical'
                                 )),
  next_action        text        not null,
  saved_memory_id    uuid,
  requires_approval  boolean     not null default false,
  dashboard_updated  boolean     not null default true,
  content            text        not null default '',
  payload            jsonb       not null default '{}'::jsonb,
  status             text        not null default 'new'
                                 check (status in (
                                   'new','reviewed','actioned','archived'
                                 )),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,
  -- Generated full-text search vector over the original content + next action.
  search_tsv         tsvector    generated always as (
                       to_tsvector(
                         'english',
                         coalesce(content, '') || ' ' ||
                         coalesce(next_action, '')
                       )
                     ) stored
);

-- Indexes on inbox_items.
create index if not exists inbox_items_search_tsv_idx   on inbox_items using gin (search_tsv);
create index if not exists inbox_items_payload_idx      on inbox_items using gin (payload);
create index if not exists inbox_items_tenant_status_idx on inbox_items (tenant_id, status);
create index if not exists inbox_items_tenant_category_idx
                                                        on inbox_items (tenant_id, category);
create index if not exists inbox_items_tenant_created_idx
                                                        on inbox_items (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for inbox_items (the only mutable table here). Reuses the
-- shared set_updated_at() function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_inbox_items on inbox_items;
create trigger set_updated_at_inbox_items
  before update on inbox_items
  for each row execute function set_updated_at();

-- >>>>> 0011_executive_inbox_rls.sql >>>>>
-- =============================================================================
-- Migration: 0011_executive_inbox_rls.sql
-- Purpose:   Enable Row-Level Security on the Executive Inbox table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy).
--            Companion to 0010_executive_inbox.sql.
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
-- MUTABLE TABLES
--   `inbox_items` is mutable — items are triaged, reviewed, actioned, and
--   archived as the executive works the inbox. The table gets
--   SELECT + INSERT + UPDATE + DELETE policies, all tenant-scoped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Executive Inbox table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table inbox_items enable row level security;

-- =============================================================================
-- inbox_items — mutable: dropped content is classified, reviewed, actioned, and
-- archived over its lifetime. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy inbox_items_select on inbox_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy inbox_items_insert on inbox_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy inbox_items_update on inbox_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy inbox_items_delete on inbox_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0012_connectors.sql >>>>>
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

-- >>>>> 0013_connectors_rls.sql >>>>>
-- =============================================================================
-- Migration: 0013_connectors_rls.sql
-- Purpose:   Enable Row-Level Security on the Connector Registry with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements SECURITY.md §2 (tenancy). Companion to 0012_connectors.sql.
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
-- MUTABLE TABLE
--   `connectors` is mutable — connectors are onboarded, enabled/disabled,
--   re-permissioned, and continuously re-synced. It gets SELECT + INSERT +
--   UPDATE + DELETE policies, all tenant-scoped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Connector Registry (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table connectors enable row level security;

-- =============================================================================
-- connectors — mutable: connectors are onboarded, enabled/disabled, and
-- re-synced over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy connectors_select on connectors
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy connectors_insert on connectors
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy connectors_update on connectors
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy connectors_delete on connectors
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0014_github_intelligence.sql >>>>>
-- =============================================================================
-- Migration: 0014_github_intelligence.sql
-- Purpose:   Create the Alfy² GitHub Intelligence System — repository assessments
--            and the Asset Library. The executive drops a GitHub repo (a link, a
--            name) and the intelligence pipeline performs a STATIC scan: it reads,
--            evaluates, and reasons about the repository, then persists the result
--            as a `repo_assessments` row (the durable form of a RepoAssessment).
--            Approved repositories graduate into `asset_library`.
--
-- TRUST POSTURE (the load-bearing principle of this system)
--   Repositories are NEVER trusted automatically and NOTHING is EVER executed.
--   An assessment is a static scan — code is read and reasoned about, not run.
--   This is enforced at the database level: `repo_assessments.executed` carries a
--   CHECK (executed = false), a hard guarantee that no row can ever record an
--   executed repository. There is no "trusted by default"; every repo earns its
--   verdict (safe / needs_review / do_not_use) through assessment alone.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0015_github_intelligence_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- repo_assessments — the persisted form of a RepoAssessment. A static scan
-- result: a repository was read, evaluated, and reasoned about, but NEVER
-- executed. Immutable once written (a scan is a point-in-time snapshot), so no
-- updated_at. Each row carries the verdict, the overall quality score, and the
-- full assessment payload (evaluation, security_findings, business_case,
-- explanation). The `executed` column is pinned false by CHECK as a hard,
-- DB-level guarantee that nothing was ever run.
-- -----------------------------------------------------------------------------
create table if not exists repo_assessments (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  url             text        not null,
  name            text        not null,
  verdict         text        not null
                              check (verdict in (
                                'safe','needs_review','do_not_use'
                              )),
  overall_quality real        not null default 0
                              check (overall_quality >= 0 and overall_quality <= 1),
  -- Hard DB-level guarantee: nothing is ever executed. A repo is only ever
  -- statically scanned, so this column can never be true.
  executed        boolean     not null default false
                              check (executed = false),
  -- The full assessment: evaluation, security_findings, business_case,
  -- explanation.
  payload         jsonb       not null default '{}'::jsonb,
  scanned_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Indexes on repo_assessments.
create index if not exists repo_assessments_tenant_verdict_idx
                                                  on repo_assessments (tenant_id, verdict);
create index if not exists repo_assessments_tenant_created_idx
                                                  on repo_assessments (tenant_id, created_at);
create index if not exists repo_assessments_payload_idx
                                                  on repo_assessments using gin (payload);

-- -----------------------------------------------------------------------------
-- asset_library — approved repositories. Once a RepoAssessment is reviewed and
-- accepted, the repository graduates here as a durable, approved asset. Mutable:
-- tags and approval metadata are curated over the asset's life, so it carries
-- updated_at maintained by the shared set_updated_at() trigger. Linked back to
-- the originating assessment via assessment_id. Unique per (tenant_id, repo_url):
-- a repository appears in a tenant's library at most once.
-- -----------------------------------------------------------------------------
create table if not exists asset_library (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  repo_url      text        not null,
  name          text        not null,
  verdict       text        not null
                            check (verdict in (
                              'safe','needs_review','do_not_use'
                            )),
  assessment_id uuid        references repo_assessments(id),
  approved_by   text        not null,
  approved_at   timestamptz not null default now(),
  tags          jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (tenant_id, repo_url)
);

-- Indexes on asset_library.
create index if not exists asset_library_tenant_verdict_idx
                                                  on asset_library (tenant_id, verdict);

-- -----------------------------------------------------------------------------
-- updated_at trigger for asset_library (the only mutable table here). Reuses the
-- shared set_updated_at() function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_asset_library on asset_library;
create trigger set_updated_at_asset_library
  before update on asset_library
  for each row execute function set_updated_at();

-- >>>>> 0015_github_intelligence_rls.sql >>>>>
-- =============================================================================
-- Migration: 0015_github_intelligence_rls.sql
-- Purpose:   Enable Row-Level Security on the GitHub Intelligence System tables
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy).
--            Companion to 0014_github_intelligence.sql.
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
-- TABLES
--   `repo_assessments` is a static-scan record — assessments are written and
--   read, never executed. `asset_library` is mutable — approved repositories are
--   curated (tags, approval metadata) over their life. Both tables get
--   SELECT + INSERT + UPDATE + DELETE policies, all tenant-scoped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the GitHub Intelligence tables (deny-by-default until policies
-- added).
-- -----------------------------------------------------------------------------
alter table repo_assessments enable row level security;
alter table asset_library    enable row level security;

-- =============================================================================
-- repo_assessments — persisted static scans of repositories. Nothing is ever
-- executed; rows are written and read. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy repo_assessments_select on repo_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy repo_assessments_insert on repo_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy repo_assessments_update on repo_assessments
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy repo_assessments_delete on repo_assessments
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- asset_library — mutable: approved repositories are curated (tags, approval
-- metadata) over their lifetime. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy asset_library_select on asset_library
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_library_insert on asset_library
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_library_update on asset_library
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_library_delete on asset_library
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0016_global_assets.sql >>>>>
-- =============================================================================
-- Migration: 0016_global_assets.sql
-- Purpose:   Create the Alfy² Global Asset Library — a single, tenant-wide index
--            of every business's assets (logos, brand guides, domains, decks,
--            contracts, SOPs, templates, automations, repos, API keys, product
--            specs, media, customer/vendor lists, campaigns, …). Every asset any
--            business owns is registered here so it is searchable GLOBALLY across
--            the executive's whole portfolio and routable by the agents.
--
--            PERMISSION MODEL: this table is tenant-isolated via RLS (see
--            0017_global_assets_rls.sql). Finer-grained, permission-AWARE access —
--            who within a tenant may see a given asset — is enforced in the
--            APPLICATION layer ON TOP OF tenant RLS. The `sensitive` and
--            `visibility` columns (plus `owner`) are the inputs that drive that
--            application-layer filtering; the database itself only guarantees
--            tenant isolation.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0017_global_assets_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- assets — one registered asset belonging to a business in the tenant's
-- portfolio. Mutable: an asset is versioned, approved, archived, and re-used over
-- its life. Each row is the searchable, permission-aware catalog entry for one
-- durable thing the executive's businesses own.
-- -----------------------------------------------------------------------------
create table if not exists assets (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  type            text        not null
                              check (type in (
                                'logo','brand_guide','domain','social_media',
                                'pitch_deck','investor_deck','sales_deck',
                                'contract','nda','sop','email_template',
                                'landing_page','automation','github_repo',
                                'api_key','product_spec','video','photo',
                                'training','pricing','vendor_list',
                                'customer_list','marketing_campaign'
                              )),
  name            text        not null,
  description     text        not null default '',
  owner           text        not null,
  business_id     text,
  version         text        not null default '1.0.0',
  status          text        not null default 'active'
                              check (status in (
                                'draft','active','archived','deprecated'
                              )),
  approval        text        not null default 'not_required'
                              check (approval in (
                                'not_required','pending','approved','rejected'
                              )),
  approved_by     text,
  location        text        not null,
  sensitive       boolean     not null default false,
  visibility      text        not null default 'business'
                              check (visibility in (
                                'tenant','business','private'
                              )),
  tags            jsonb       not null default '[]'::jsonb,
  relationships   jsonb       not null default '[]'::jsonb,
  usage_history   jsonb       not null default '[]'::jsonb,
  keywords        jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  -- Generated full-text search vector over name + description + type.
  search_tsv      tsvector    generated always as (
                    to_tsvector(
                      'english',
                      coalesce(name, '')        || ' ' ||
                      coalesce(description, '') || ' ' ||
                      coalesce(type, '')
                    )
                  ) stored
);

-- Indexes on assets.
create index if not exists assets_search_tsv_idx       on assets using gin (search_tsv);
create index if not exists assets_tags_idx             on assets using gin (tags);
create index if not exists assets_tenant_type_idx      on assets (tenant_id, type);
create index if not exists assets_tenant_business_idx  on assets (tenant_id, business_id);
create index if not exists assets_tenant_status_idx    on assets (tenant_id, status);
create index if not exists assets_tenant_owner_idx     on assets (tenant_id, owner);

-- -----------------------------------------------------------------------------
-- updated_at trigger for assets (the only mutable table here). Reuses the shared
-- set_updated_at() function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_assets on assets;
create trigger set_updated_at_assets
  before update on assets
  for each row execute function set_updated_at();

-- >>>>> 0017_global_assets_rls.sql >>>>>
-- =============================================================================
-- Migration: 0017_global_assets_rls.sql
-- Purpose:   Enable Row-Level Security on the Global Asset Library table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Implements TECH_SPEC.md §5/§10 and SECURITY.md §2 (tenancy).
--            Companion to 0016_global_assets.sql.
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
-- PERMISSION-AWARE FILTERING (APPLICATION LAYER)
--   This RLS guarantees TENANT ISOLATION only. Finer-grained, per-asset
--   permission filtering — private/sensitive assets, owner checks, and
--   role-based visibility (the `sensitive`, `visibility`, and `owner` columns) —
--   is applied in the APPLICATION layer ON TOP OF this tenant RLS. The database
--   never returns another tenant's assets; the application narrows further to
--   what the requesting user is allowed to see within the tenant.
--
-- MUTABLE TABLES
--   `assets` is mutable — an asset is versioned, approved, archived, and re-used
--   over its lifetime. The table gets SELECT + INSERT + UPDATE + DELETE policies,
--   all tenant-scoped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the Global Asset Library table (deny-by-default until policies
-- added).
-- -----------------------------------------------------------------------------
alter table assets enable row level security;

-- =============================================================================
-- assets — mutable: assets are registered, versioned, approved, archived, and
-- re-used over their lifetime. select/insert/update/delete, all tenant-scoped.
-- Per-asset permission filtering (private/sensitive, owner, role) is layered on
-- top of this tenant RLS in the application.
-- =============================================================================
create policy assets_select on assets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy assets_insert on assets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy assets_update on assets
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy assets_delete on assets
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0018_enterprise_security.sql >>>>>
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

-- >>>>> 0019_enterprise_security_rls.sql >>>>>
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

-- >>>>> 0020_goals.sql >>>>>
-- =============================================================================
-- Migration: 0020_goals.sql
-- Purpose:   Stand up the Alfy² Goal Engine — a single `goals` table that drives
--            the operator's outcome-oriented planning loop. Implements the Goal
--            Engine model on top of the existing tenant-scoped platform.
--
-- GOAL ENGINE MODEL
--   - Nine goal types span the operator's life and businesses:
--       personal, financial, business, health, learning, relationships,
--       launches, sales, cash_flow.
--   - A goal moves through a lifecycle: draft → active → (paused | review_required)
--     → completed (or cancelled). Once a goal is APPROVED, the engine pursues it
--     continuously until it is completed, paused, cancelled, or flagged
--     review_required — it does not silently lapse.
--   - The strategic reasoning behind a goal is stored as JSON, not normalized:
--       * analysis (GoalAnalysis): current/desired state, the gap between them,
--         constraints, available resources, best_opportunities, the three
--         candidate paths, and the recommended_path.
--       * plan (GoalPlan): weekly_plan, daily_priorities, recommended_agents,
--         recommended_automations, expected_completion, and risk_analysis.
--   - Goals are recalculated as conditions change. Each recalculation bumps
--     `version` and stamps `last_recalculated_at`, so the analysis/plan always
--     reflect the latest pass.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0021_goals_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- goals — outcome the operator is pursuing, with its full analysis and plan.
-- A goal is one of nine types, carries a status lifecycle and a priority level,
-- and tracks measurable progress (metric/unit + baseline/current/target). The
-- strategic reasoning (analysis) and the execution plan (plan) are stored as
-- jsonb. `version` increments on each recalculation. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists goals (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  type                  text              not null
                                          check (type in (
                                            'personal','financial','business','health','learning',
                                            'relationships','launches','sales','cash_flow')),
  title                 text              not null,
  description           text              not null default '',
  status                text              not null default 'draft'
                                          check (status in (
                                            'draft','active','paused','cancelled',
                                            'completed','review_required')),
  approved              boolean           not null default false,
  business_id           uuid,
  metric                text,
  unit                  text,
  baseline_value        double precision,
  current_value         double precision,
  target_value          double precision,
  deadline              timestamptz,
  priority_level        text              not null
                                          check (priority_level in ('low','medium','high','critical')),
  analysis              jsonb             not null default '{}'::jsonb,
  plan                  jsonb             not null default '{}'::jsonb,
  version               integer           not null default 1 check (version > 0),
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz,
  last_recalculated_at  timestamptz
);

create index if not exists goals_tenant_status_idx
  on goals (tenant_id, status);

create index if not exists goals_tenant_type_idx
  on goals (tenant_id, type);

create index if not exists goals_tenant_business_idx
  on goals (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for goals. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_goals on goals;
create trigger set_updated_at_goals
  before update on goals
  for each row execute function set_updated_at();

-- >>>>> 0021_goals_rls.sql >>>>>
-- =============================================================================
-- Migration: 0021_goals_rls.sql
-- Purpose:   Enable Row-Level Security on the Goal Engine `goals` table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002 and 0019.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the goals table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table goals enable row level security;

-- =============================================================================
-- goals — mutable: goals are drafted, approved, pursued, recalculated, and
-- retired over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy goals_select on goals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy goals_insert on goals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy goals_update on goals
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy goals_delete on goals
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0022_persistent_approvals.sql >>>>>
-- =============================================================================
-- Migration: 0022_persistent_approvals.sql
-- Purpose:   Stand up the Alfy² Persistent Approval feature — a single
--            `persistent_approvals` table that records standing operator grants.
--            Implements Persistent Approval on top of the tenant-scoped platform.
--
-- PERSISTENT APPROVAL MODEL
--   - The operator approves a workflow ONCE and that decision becomes a standing
--     grant: the agent may keep taking the approved class of action without
--     queuing a fresh approval each time.
--   - A grant carries:
--       * scope (jsonb): what it covers — action_class, action_pattern,
--         business_id, goal_id, environments.
--       * limits (jsonb): guardrails — max_uses, used_count, max_amount_usd.
--       * success_metrics (jsonb array): the outcomes the grant is judged against.
--       * review_schedule: how the grant is re-examined — none, monthly,
--         quarterly, or on_expiry.
--   - grant_type captures the operator's intent: a one-off "remember_this", an
--     open-ended "always" or "business" grant, "until_goal" (tied to a goal),
--     a fixed "duration", or a recurring "review_monthly"/"review_quarterly".
--   - Grants AUTO-EXPIRE: when expires_at passes (or a review falls due) the grant
--     leaves 'active' and enters 'in_review' / 'expired', and the operator is asked
--     again. A grant can also be 'revoked' at any time.
--   - The Security Gate consults active, in-scope, in-limit grants BEFORE queuing a
--     fresh approval — a matching grant lets the action proceed without re-prompting.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0023_persistent_approvals_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- persistent_approvals — a standing grant the operator approved once.
-- Identified by a principal + human-readable label, classified by grant_type,
-- and bounded by scope/limits/success_metrics. A review_schedule and expires_at/
-- next_review_at drive the grant's lifecycle: active → in_review → expired (or
-- revoked). The Security Gate reads active, in-scope grants before queuing a new
-- approval. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists persistent_approvals (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  principal        text        not null,
  label            text        not null,
  grant_type       text        not null
                               check (grant_type in (
                                 'remember_this','always','business','until_goal',
                                 'duration','review_monthly','review_quarterly')),
  scope            jsonb       not null default '{}'::jsonb,
  limits           jsonb       not null default '{}'::jsonb,
  success_metrics  jsonb       not null default '[]'::jsonb,
  review_schedule  text        not null default 'none'
                               check (review_schedule in (
                                 'none','monthly','quarterly','on_expiry')),
  status           text        not null default 'active'
                               check (status in (
                                 'active','in_review','expired','revoked')),
  expires_at       timestamptz,
  next_review_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

create index if not exists persistent_approvals_tenant_status_idx
  on persistent_approvals (tenant_id, status);

create index if not exists persistent_approvals_tenant_expires_idx
  on persistent_approvals (tenant_id, expires_at);

create index if not exists persistent_approvals_tenant_next_review_idx
  on persistent_approvals (tenant_id, next_review_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for persistent_approvals. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_persistent_approvals on persistent_approvals;
create trigger set_updated_at_persistent_approvals
  before update on persistent_approvals
  for each row execute function set_updated_at();

-- >>>>> 0023_persistent_approvals_rls.sql >>>>>
-- =============================================================================
-- Migration: 0023_persistent_approvals_rls.sql
-- Purpose:   Enable Row-Level Security on the Persistent Approval
--            `persistent_approvals` table with a DENY-BY-DEFAULT posture, then
--            add tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0021.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the persistent_approvals table (deny-by-default until policies
-- are added).
-- -----------------------------------------------------------------------------
alter table persistent_approvals enable row level security;

-- =============================================================================
-- persistent_approvals — mutable: standing grants are created, consulted,
-- reviewed, expired, and revoked over time. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy persistent_approvals_select on persistent_approvals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy persistent_approvals_insert on persistent_approvals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy persistent_approvals_update on persistent_approvals
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy persistent_approvals_delete on persistent_approvals
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0024_campaigns.sql >>>>>
-- =============================================================================
-- Migration: 0024_campaigns.sql
-- Purpose:   Stand up the Alfy² Campaign Intelligence feature — a single
--            `campaigns` table that drives the operator's marketing/outreach
--            execution loop. Implements Campaign Intelligence on top of the
--            tenant-scoped platform.
--
-- CAMPAIGN INTELLIGENCE MODEL
--   - Six campaign types span the operator's growth surface:
--       email, social, landing_page, funnel, outreach, lead_nurturing.
--   - Every campaign is run as an A/B test: `variants` holds the variant pair
--     the engine pits against each other, and `success_metrics` holds the
--     outcomes the campaign is judged against.
--   - The engine generates automatic reporting + recommendations: the most
--     recent generated report (performance, A/B winner, and recommended next
--     actions) is stored on `latest_report`.
--   - Campaigns self-optimize on a cadence — `optimization_cadence` is 'monthly'
--     by default (or 'none'); each optimization pass stamps `last_optimized_at`
--     and bumps `version`.
--   - A campaign moves through a lifecycle:
--       draft → active → (paused) → completed (or stopped).
--   - Once APPROVED, a campaign runs on AUTOPILOT — the engine keeps executing
--     and optimizing it without a fresh approval each cycle — until a stop
--     condition fires. `stop_conditions` (min_conversion_rate, max_risk,
--     goal_id, approval_id) define when to halt, and the reason the campaign
--     left autopilot is recorded in `stop_reason`:
--       goal_reached, performance_drop, risk_increase, approval_expired,
--       paused, manual.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0025_campaigns_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- campaigns — a marketing/outreach campaign the operator is running, with its
-- A/B variant pair, success metrics, stop conditions, and latest generated
-- report. One of six types, carries a status lifecycle, and (once approved) runs
-- on autopilot until a stop condition fires — the reason is recorded in
-- stop_reason. `optimization_cadence` drives self-optimization; each pass stamps
-- last_optimized_at and bumps `version`. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists campaigns (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  type                  text              not null
                                          check (type in (
                                            'email','social','landing_page',
                                            'funnel','outreach','lead_nurturing')),
  name                  text              not null,
  objective             text              not null default '',
  business_id           uuid,
  goal_id               uuid,
  approval_id           uuid,
  status                text              not null default 'draft'
                                          check (status in (
                                            'draft','active','paused','completed','stopped')),
  stop_reason           text              check (stop_reason in (
                                            'goal_reached','performance_drop','risk_increase',
                                            'approval_expired','paused','manual')),
  variants              jsonb             not null default '[]'::jsonb,
  success_metrics       jsonb             not null default '[]'::jsonb,
  stop_conditions       jsonb             not null default '{}'::jsonb,
  optimization_cadence  text              not null default 'monthly'
                                          check (optimization_cadence in ('monthly','none')),
  latest_report         jsonb,
  version               integer           not null default 1 check (version > 0),
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz,
  last_optimized_at     timestamptz
);

create index if not exists campaigns_tenant_status_idx
  on campaigns (tenant_id, status);

create index if not exists campaigns_tenant_type_idx
  on campaigns (tenant_id, type);

create index if not exists campaigns_tenant_business_idx
  on campaigns (tenant_id, business_id);

create index if not exists campaigns_tenant_goal_idx
  on campaigns (tenant_id, goal_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for campaigns. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_campaigns on campaigns;
create trigger set_updated_at_campaigns
  before update on campaigns
  for each row execute function set_updated_at();

-- >>>>> 0025_campaigns_rls.sql >>>>>
-- =============================================================================
-- Migration: 0025_campaigns_rls.sql
-- Purpose:   Enable Row-Level Security on the Campaign Intelligence `campaigns`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and 0023.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the campaigns table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table campaigns enable row level security;

-- =============================================================================
-- campaigns — mutable: campaigns are created, run, optimized, paused, stopped,
-- and completed over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy campaigns_select on campaigns
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy campaigns_insert on campaigns
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy campaigns_update on campaigns
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy campaigns_delete on campaigns
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0026_opportunities.sql >>>>>
-- =============================================================================
-- Migration: 0026_opportunities.sql
-- Purpose:   Stand up the Alfy² Opportunity Intelligence feature — a single
--            `opportunities` table that holds the ranked opportunities the
--            engine surfaces to the operator. Implements Opportunity
--            Intelligence on top of the tenant-scoped platform.
--
-- OPPORTUNITY INTELLIGENCE MODEL
--   - The engine continuously analyzes TEN entity sources across the operator's
--     world — contacts, businesses, vendors, investors, clients, ideas, github
--     repos, assets, conversations, and market trends — and looks for
--     relationships BETWEEN them.
--   - Each discovered relationship is classified by `kind`:
--       fit, introduction, solves, investment, partnership, synergy,
--       trend_tailwind.
--   - An opportunity connects a `source` entity to a `target` entity. Both are
--     stored as EntityRef snapshots (ref_id, kind, name, business_id, tags,
--     keywords, attributes) so the opportunity stays meaningful even as the
--     underlying entities change.
--   - `rationale` explains why the relationship matters; `evidence` carries the
--     supporting signals the engine used to reach it.
--   - Every opportunity is RANKED. `scores` holds six 0..1 dimensions —
--       revenue, probability, effort, risk, strategic_value, composite —
--     where `composite` is the blended rank the surfacing order is driven by.
--   - The engine attaches a `recommended_action` plus the
--     `recommended_agents` best suited to act on it.
--   - An opportunity moves through a lifecycle:
--       new → surfaced → accepted (or dismissed) → acted.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0027_opportunities_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- opportunities — a ranked opportunity surfaced by the engine after analyzing
-- the ten entity sources and finding a relationship between a source and target
-- entity (both stored as EntityRef snapshots). Classified by `kind`, scored on
-- revenue/probability/effort/risk/strategic_value (composite drives surfacing
-- order), carries a rationale + evidence + recommended action/agents, and moves
-- through a status lifecycle. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists opportunities (
  id                   uuid          primary key default gen_random_uuid(),
  tenant_id            uuid          not null,
  kind                 text          not null
                                     check (kind in (
                                       'fit','introduction','solves','investment',
                                       'partnership','synergy','trend_tailwind')),
  title                text          not null,
  source               jsonb         not null default '{}'::jsonb,
  target               jsonb         not null default '{}'::jsonb,
  rationale            text          not null default '',
  evidence             jsonb         not null default '[]'::jsonb,
  scores               jsonb         not null default '{}'::jsonb,
  recommended_action   text          not null default '',
  recommended_agents   jsonb         not null default '[]'::jsonb,
  status               text          not null default 'new'
                                     check (status in (
                                       'new','surfaced','accepted','dismissed','acted')),
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz
);

create index if not exists opportunities_tenant_status_idx
  on opportunities (tenant_id, status);

create index if not exists opportunities_tenant_kind_idx
  on opportunities (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- updated_at trigger for opportunities. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_opportunities on opportunities;
create trigger set_updated_at_opportunities
  before update on opportunities
  for each row execute function set_updated_at();

-- >>>>> 0027_opportunities_rls.sql >>>>>
-- =============================================================================
-- Migration: 0027_opportunities_rls.sql
-- Purpose:   Enable Row-Level Security on the Opportunity Intelligence
--            `opportunities` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the opportunities table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table opportunities enable row level security;

-- =============================================================================
-- opportunities — mutable: opportunities are surfaced, accepted, dismissed, and
-- acted on over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy opportunities_select on opportunities
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy opportunities_insert on opportunities
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy opportunities_update on opportunities
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy opportunities_delete on opportunities
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0028_pattern_observability.sql >>>>>
-- =============================================================================
-- Migration: 0028_pattern_observability.sql
-- Purpose:   Stand up the Alfy² Pattern Engine self-awareness storage — two
--            tables that let the engine observe the operator's behavior over
--            time and generate advisory reports about it.
--
-- PATTERN ENGINE MODEL
--   - `pattern_observations` is an APPEND-ONLY stream of behavioral data points.
--     The engine records a `signal` (work_session, avoidance, performance,
--     energy, focus, stress, health, follow_up, sales, launch, meeting,
--     calendar, decision, productivity), an optional 0..1 `measure`, a free-text
--     `label`, and a `context` snapshot. Observations are facts about what
--     happened; they are never edited or deleted.
--   - `pattern_reports` is an APPEND-ONLY stream of generated advisory reports.
--     Each report summarizes a `window` of observations into detected
--     `patterns`, `bottlenecks`, `strengths`, `repeating_mistakes`,
--     `successful_habits`, and a set of recommendations (automations, agents,
--     workflow improvements, schedule changes) plus a `summary`.
--   - Reports are ADVISORY ONLY. `advisory_only` is pinned true by a CHECK
--     constraint: the engine surfaces self-awareness to the operator but NEVER
--     changes behavior on its own.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - These tables are append-only, so they carry NO updated_at column.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0029_pattern_observability_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pattern_observations — append-only behavioral data points the engine records
-- as it watches the operator's world. Each row is one observation of a `signal`
-- with an optional 0..1 `measure`, a `label`, and a `context` snapshot. Facts,
-- not edited in place: append-only, no updated_at. (immutability enforced in
-- 0029)
-- -----------------------------------------------------------------------------
create table if not exists pattern_observations (
  id          uuid              primary key default gen_random_uuid(),
  tenant_id   uuid              not null,
  at          timestamptz       not null default now(),
  signal      text              not null
                                check (signal in (
                                  'work_session','avoidance','performance','energy',
                                  'focus','stress','health','follow_up','sales',
                                  'launch','meeting','calendar','decision',
                                  'productivity')),
  measure     double precision,
  label       text              not null default '',
  context     jsonb             not null default '{}'::jsonb,
  created_at  timestamptz       not null default now()
);

create index if not exists pattern_observations_tenant_signal_idx
  on pattern_observations (tenant_id, signal);

create index if not exists pattern_observations_tenant_at_idx
  on pattern_observations (tenant_id, at);

-- -----------------------------------------------------------------------------
-- pattern_reports — append-only advisory reports the engine generates by
-- summarizing a `window` of observations. Carries detected patterns,
-- bottlenecks, strengths, repeating mistakes, successful habits, and
-- recommendations (automations, agents, workflow improvements, schedule
-- changes) plus a `summary`. ADVISORY ONLY: `advisory_only` is pinned true by a
-- CHECK — the engine never changes behavior. Append-only, no updated_at.
-- (immutability enforced in 0029)
-- -----------------------------------------------------------------------------
create table if not exists pattern_reports (
  id                          uuid          primary key default gen_random_uuid(),
  tenant_id                   uuid          not null,
  generated_at                timestamptz   not null default now(),
  window                      jsonb         not null default '{}'::jsonb,
  patterns                    jsonb         not null default '[]'::jsonb,
  bottlenecks                 jsonb         not null default '[]'::jsonb,
  strengths                   jsonb         not null default '[]'::jsonb,
  repeating_mistakes          jsonb         not null default '[]'::jsonb,
  successful_habits           jsonb         not null default '[]'::jsonb,
  recommended_automations     jsonb         not null default '[]'::jsonb,
  recommended_agents          jsonb         not null default '[]'::jsonb,
  workflow_improvements       jsonb         not null default '[]'::jsonb,
  schedule_recommendations    jsonb         not null default '[]'::jsonb,
  summary                     text          not null default '',
  advisory_only               boolean       not null default true
                                            check (advisory_only = true),
  created_at                  timestamptz   not null default now()
);

create index if not exists pattern_reports_tenant_generated_at_idx
  on pattern_reports (tenant_id, generated_at);

-- >>>>> 0029_pattern_observability_rls.sql >>>>>
-- =============================================================================
-- Migration: 0029_pattern_observability_rls.sql
-- Purpose:   Enable Row-Level Security on the Pattern Engine self-awareness
--            tables (pattern_observations, pattern_reports) with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002 and the append-only treatment
--            of `events` / `audit_log`.
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
--   Both `pattern_observations` and `pattern_reports` get INSERT + SELECT
--   policies ONLY. The deliberate ABSENCE of UPDATE and DELETE policies,
--   combined with deny-by-default, makes existing rows immutable — no caller can
--   mutate or remove them. Observations are recorded facts; reports are
--   advisory and never revised. (Same treatment as events / audit_log in 0002.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on both tables (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table pattern_observations enable row level security;
alter table pattern_reports      enable row level security;

-- =============================================================================
-- pattern_observations — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing observation row immutable. (mirrors events / audit_log §4)
-- =============================================================================
create policy pattern_observations_select on pattern_observations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pattern_observations_insert on pattern_observations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- pattern_reports — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing report row immutable. Reports are advisory-only and never
-- revised in place. (mirrors events / audit_log §4)
-- =============================================================================
create policy pattern_reports_select on pattern_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pattern_reports_insert on pattern_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0030_agent_actions.sql >>>>>
-- =============================================================================
-- Migration: 0030_agent_actions.sql
-- Purpose:   Agent Observability — an APPEND-ONLY provenance log of every agent
--            action so Alfy² can answer what an agent did, why, what data it
--            used, and what changed afterward. Each row is one immutable record
--            of a single agent action: its task, inputs, tools and memory used,
--            decision and rationale, approval status, cost/runtime, outcome,
--            errors, downstream effects, value, and risk.
--
-- HARD GUARANTEE
--   - agent_actions is APPEND-ONLY. It has no updated_at and no trigger, and
--     0031 grants it INSERT + SELECT only — the deliberate absence of
--     UPDATE/DELETE policies (under deny-by-default) makes every action row
--     immutable, exactly like `security_audit` (0018/0019) and `events`/
--     `audit_log` (0001/0002).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables — intentionally absent here.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0031_agent_actions_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- agent_actions — APPEND-ONLY provenance log of every agent action. One
-- immutable record per action with full provenance: the task and input, the
-- tools and memory it used, the decision and rationale, whether approval was
-- required and how it resolved, cost/runtime, the outcome, any errors, the
-- downstream effects it caused, the value it produced, and its risk level.
-- No updated_at: action rows are immutable (enforced in 0031).
-- -----------------------------------------------------------------------------
create table if not exists agent_actions (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  agent_name          text              not null,
  task                text              not null,
  input               text              not null default '',
  tools_used          jsonb             not null default '[]'::jsonb,
  memory_used         jsonb             not null default '[]'::jsonb,
  decision            text              not null default '',
  rationale           text              not null default '',
  approval_status     text              not null default 'not_required'
                                        check (approval_status in (
                                          'not_required','auto_approved','approved','pending','rejected')),
  cost_usd            double precision  not null default 0,
  runtime_ms          integer           not null default 0,
  outcome             text              not null
                                        check (outcome in (
                                          'success','partial','failure','skipped','blocked')),
  errors              jsonb             not null default '[]'::jsonb,
  downstream_effects  jsonb             not null default '[]'::jsonb,
  value_usd           double precision  not null default 0,
  risk_level          text              not null default 'low'
                                        check (risk_level in ('low','medium','high')),
  at                  timestamptz       not null default now(),
  created_at          timestamptz       not null default now()
);

create index if not exists agent_actions_tenant_agent_name_idx
  on agent_actions (tenant_id, agent_name);

create index if not exists agent_actions_tenant_outcome_idx
  on agent_actions (tenant_id, outcome);

create index if not exists agent_actions_tenant_at_idx
  on agent_actions (tenant_id, at);

create index if not exists agent_actions_tenant_approval_status_idx
  on agent_actions (tenant_id, approval_status);

-- >>>>> 0031_agent_actions_rls.sql >>>>>
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

-- >>>>> 0032_simulations.sql >>>>>
-- =============================================================================
-- Migration: 0032_simulations.sql
-- Purpose:   Stand up the Alfy² Simulation Engine — a single `simulations` table
--            that stores the outcome of a simulation run. Implements the
--            Simulation Engine on top of the tenant-scoped platform.
--
-- SIMULATION ENGINE MODEL
--   Before launching major workflows, the engine simulates outcomes and stores
--   the result: a best / likely / worst case, the risks it surfaced, a
--   recommendation, and the decision the operator now needs to make.
--   - Eight simulation kinds span the operator's decision surface:
--       campaign_outcome, revenue_path, hiring_vs_automation, pricing_change,
--       priority_shift, cash_flow, implementation_risk, agent_failure.
--   - Each run projects over a `horizon_days` window and records three scenarios
--     (best_case, likely_case, worst_case) plus an optional `expected_value`.
--   - `risks` holds the surfaced risk set; `recommendation` and `decision_needed`
--     carry the engine's call to action.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0033_simulations_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- simulations — a stored simulation result. Before launching a major workflow,
-- the engine simulates outcomes over a horizon and stores the best / likely /
-- worst case, the surfaced risks, an expected value, a recommendation, and the
-- decision the operator now needs to make. One of eight kinds. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists simulations (
  id               uuid             primary key default gen_random_uuid(),
  tenant_id        uuid             not null,
  kind             text             not null
                                    check (kind in (
                                      'campaign_outcome','revenue_path','hiring_vs_automation',
                                      'pricing_change','priority_shift','cash_flow',
                                      'implementation_risk','agent_failure')),
  name             text             not null,
  horizon_days     integer          not null default 90 check (horizon_days > 0),
  best_case        jsonb            not null default '{}'::jsonb,
  likely_case      jsonb            not null default '{}'::jsonb,
  worst_case       jsonb            not null default '{}'::jsonb,
  expected_value   double precision,
  risks            jsonb            not null default '[]'::jsonb,
  recommendation   text             not null default '',
  decision_needed  text             not null default '',
  created_at       timestamptz      not null default now(),
  updated_at       timestamptz
);

create index if not exists simulations_tenant_kind_idx
  on simulations (tenant_id, kind);

create index if not exists simulations_tenant_created_idx
  on simulations (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for simulations. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_simulations on simulations;
create trigger set_updated_at_simulations
  before update on simulations
  for each row execute function set_updated_at();

-- >>>>> 0033_simulations_rls.sql >>>>>
-- =============================================================================
-- Migration: 0033_simulations_rls.sql
-- Purpose:   Enable Row-Level Security on the Simulation Engine `simulations`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the simulations table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table simulations enable row level security;

-- =============================================================================
-- simulations — mutable: simulation results are created, refined, and revised
-- as inputs change. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy simulations_select on simulations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy simulations_insert on simulations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy simulations_update on simulations
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy simulations_delete on simulations
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0034_ai_coe_standards.sql >>>>>
-- =============================================================================
-- Migration: 0034_ai_coe_standards.sql
-- Purpose:   Stand up the Alfy² AI Center of Excellence — the internal standards
--            layer (approved prompt library, agent/workflow templates, and
--            security/data/naming/testing/documentation/escalation/model-usage/
--            cost standards) that every new agent, workflow, and connector must
--            follow. A single `coe_standards` table holds the approved standards
--            library on top of the tenant-scoped platform.
--
-- AI CENTER OF EXCELLENCE MODEL
--   - The CoE is the operator's internal standards library: the curated,
--     approved canon every new agent, workflow, and connector is built against.
--   - `kind` spans the standard categories the CoE governs:
--       prompt, agent_template, workflow_template, security_standard,
--       data_standard, naming_convention, testing_standard,
--       documentation_standard, escalation_rule, model_usage_rule, cost_control.
--   - Each standard carries a semantic `version` and a lifecycle `status`:
--       draft → approved → deprecated.
--   - `summary` and `body` hold the human-readable standard; `rules` holds the
--     machine-checkable clauses the standard enforces, and `tags` aid discovery.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0035_ai_coe_standards_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- coe_standards — an approved standard in the AI Center of Excellence library.
-- One of eleven kinds (approved prompt, agent/workflow template, or a
-- security/data/naming/testing/documentation/escalation/model-usage/cost
-- standard), carrying a semantic version and a draft → approved → deprecated
-- lifecycle. `summary`/`body` hold the human-readable standard, `rules` holds the
-- machine-checkable clauses, and `tags` aid discovery. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists coe_standards (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  kind        text        not null
                          check (kind in (
                            'prompt','agent_template','workflow_template',
                            'security_standard','data_standard','naming_convention',
                            'testing_standard','documentation_standard',
                            'escalation_rule','model_usage_rule','cost_control')),
  name        text        not null,
  version     text        not null default '1.0.0',
  status      text        not null default 'draft'
                          check (status in ('draft','approved','deprecated')),
  summary     text        not null default '',
  body        text        not null default '',
  rules       jsonb       not null default '[]'::jsonb,
  tags        jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists coe_standards_tenant_kind_idx
  on coe_standards (tenant_id, kind);

create index if not exists coe_standards_tenant_status_idx
  on coe_standards (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for coe_standards. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_coe_standards on coe_standards;
create trigger set_updated_at_coe_standards
  before update on coe_standards
  for each row execute function set_updated_at();

-- >>>>> 0035_ai_coe_standards_rls.sql >>>>>
-- =============================================================================
-- Migration: 0035_ai_coe_standards_rls.sql
-- Purpose:   Enable Row-Level Security on the AI Center of Excellence
--            `coe_standards` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the coe_standards table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table coe_standards enable row level security;

-- =============================================================================
-- coe_standards — mutable: standards are drafted, approved, revised, and
-- deprecated over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy coe_standards_select on coe_standards
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy coe_standards_insert on coe_standards
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy coe_standards_update on coe_standards
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy coe_standards_delete on coe_standards
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0036_workflow_roi.sql >>>>>
-- =============================================================================
-- Migration: 0036_workflow_roi.sql
-- Purpose:   Stand up the Alfy² Workflow ROI Tracking feature — a single
--            `workflow_roi` table that scores each automation's value against
--            its cost and ranks the portfolio. Implements Workflow ROI Tracking
--            on top of the tenant-scoped platform.
--
-- WORKFLOW ROI MODEL
--   - Each row captures one automation's value vs cost over a period:
--       * `metrics` (jsonb) holds the raw drivers the engine measures —
--         time_saved_hours, revenue_generated_usd, cost_reduced_usd,
--         errors_reduced, risk_reduced, conversion_improvement,
--         operating_cost_usd, model_tool_cost_usd, human_time_required_hours.
--       * `value_usd` is the dollarized value the workflow produced.
--       * `total_cost_usd` is the dollarized cost to run it.
--       * `net_value_usd` is value minus cost (the bottom line).
--       * `roi_score` is the ranked ROI (nullable until first computed).
--   - The engine emits a single recommendation per workflow — scale, pause,
--     improve, or delete — with a human-readable `rationale` explaining why.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural/entity snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0037_workflow_roi_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- workflow_roi — per-automation value vs cost, ranked, with a scale/pause/
-- improve/delete recommendation. `metrics` holds the measured drivers, the
-- *_usd columns dollarize value and cost, `net_value_usd` is the bottom line,
-- `roi_score` ranks the portfolio, and `recommendation`/`rationale` carry the
-- engine's call and reasoning. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists workflow_roi (
  id              uuid              primary key default gen_random_uuid(),
  tenant_id       uuid              not null,
  workflow_name   text              not null,
  metrics         jsonb             not null default '{}'::jsonb,
  value_usd       double precision  not null default 0,
  total_cost_usd  double precision  not null default 0,
  net_value_usd   double precision  not null default 0,
  roi_score       double precision,
  recommendation  text              not null
                                    check (recommendation in (
                                      'scale','pause','improve','delete')),
  rationale       text              not null default '',
  created_at      timestamptz       not null default now(),
  updated_at      timestamptz
);

create index if not exists workflow_roi_tenant_recommendation_idx
  on workflow_roi (tenant_id, recommendation);

create index if not exists workflow_roi_tenant_workflow_name_idx
  on workflow_roi (tenant_id, workflow_name);

-- -----------------------------------------------------------------------------
-- updated_at trigger for workflow_roi. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_workflow_roi on workflow_roi;
create trigger set_updated_at_workflow_roi
  before update on workflow_roi
  for each row execute function set_updated_at();

-- >>>>> 0037_workflow_roi_rls.sql >>>>>
-- =============================================================================
-- Migration: 0037_workflow_roi_rls.sql
-- Purpose:   Enable Row-Level Security on the Workflow ROI Tracking
--            `workflow_roi` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the workflow_roi table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table workflow_roi enable row level security;

-- =============================================================================
-- workflow_roi — mutable: ROI rows are scored, re-scored, and re-ranked as the
-- engine re-evaluates each workflow. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy workflow_roi_select on workflow_roi
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_roi_insert on workflow_roi
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_roi_update on workflow_roi
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_roi_delete on workflow_roi
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0038_domain_models.sql >>>>>
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

-- >>>>> 0039_domain_models_rls.sql >>>>>
-- =============================================================================
-- Migration: 0039_domain_models_rls.sql
-- Purpose:   Enable Row-Level Security on the Domain Operating Models
--            `domain_models` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the domain_models table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table domain_models enable row level security;

-- =============================================================================
-- domain_models — mutable: operating models are created, refined, versioned,
-- and retired over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy domain_models_select on domain_models
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy domain_models_insert on domain_models
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy domain_models_update on domain_models
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy domain_models_delete on domain_models
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0040_agent_identities.sql >>>>>
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

-- >>>>> 0041_agent_identities_rls.sql >>>>>
-- =============================================================================
-- Migration: 0041_agent_identities_rls.sql
-- Purpose:   Enable Row-Level Security on the Agent Identity & Zero Trust
--            `agent_identities` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the agent_identities table (deny-by-default until policies are
-- added).
-- -----------------------------------------------------------------------------
alter table agent_identities enable row level security;

-- =============================================================================
-- agent_identities — mutable: identities are created, scoped, granted new
-- capabilities, suspended, and revoked over time. select/insert/update/delete,
-- all tenant-scoped.
-- =============================================================================
create policy agent_identities_select on agent_identities
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_identities_insert on agent_identities
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_identities_update on agent_identities
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_identities_delete on agent_identities
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0042_source_records.sql >>>>>
-- =============================================================================
-- Migration: 0042_source_records.sql
-- Purpose:   Stand up the Alfy² Source-of-Truth Management feature — a single
--            `source_records` table that lets the operator distinguish the
--            provenance and trustworthiness of every piece of knowledge the
--            system relies on. Built on top of the tenant-scoped platform.
--
-- SOURCE-OF-TRUTH MODEL
--   - Nine record kinds distinguish what a statement actually is:
--       verified_fact, assumption, outdated, user_preference, inferred_pattern,
--       external_research, document, contact, financial_data.
--   - Every record carries the metadata needed to trust (or distrust) it:
--       * source            — where the statement came from.
--       * confidence        — how sure we are, in [0,1].
--       * owner             — who is responsible for the statement.
--       * last_verified_at  — when it was last confirmed against reality.
--       * freshness         — fresh → aging → stale → expired as it ages.
--       * update_trigger    — what event should prompt a re-verification.
--   - Records can link back to a memory entry (`memory_id`) and carry free-form
--     `tags` for retrieval/grouping.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0043_source_records_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- source_records — a single piece of knowledge with its provenance. One of nine
-- kinds (verified_fact, assumption, outdated, user_preference, inferred_pattern,
-- external_research, document, contact, financial_data). Every record carries
-- source, confidence, owner, last_verified_at, freshness, and update_trigger so
-- the system can reason about how much to trust it and when to re-verify.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists source_records (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  kind              text              not null
                                      check (kind in (
                                        'verified_fact','assumption','outdated',
                                        'user_preference','inferred_pattern',
                                        'external_research','document','contact',
                                        'financial_data')),
  statement         text              not null,
  source            text              not null,
  confidence        double precision  not null default 0.5
                                      check (confidence >= 0 and confidence <= 1),
  owner             text              not null,
  last_verified_at  timestamptz,
  freshness         text              not null default 'fresh'
                                      check (freshness in (
                                        'fresh','aging','stale','expired')),
  update_trigger    text              not null default '',
  memory_id         text,
  tags              jsonb             not null default '[]'::jsonb,
  created_at        timestamptz       not null default now(),
  updated_at        timestamptz
);

create index if not exists source_records_tenant_kind_idx
  on source_records (tenant_id, kind);

create index if not exists source_records_tenant_freshness_idx
  on source_records (tenant_id, freshness);

-- -----------------------------------------------------------------------------
-- updated_at trigger for source_records. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_source_records on source_records;
create trigger set_updated_at_source_records
  before update on source_records
  for each row execute function set_updated_at();

-- >>>>> 0043_source_records_rls.sql >>>>>
-- =============================================================================
-- Migration: 0043_source_records_rls.sql
-- Purpose:   Enable Row-Level Security on the Source-of-Truth Management
--            `source_records` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the source_records table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table source_records enable row level security;

-- =============================================================================
-- source_records — mutable: records are created, re-verified, re-scored, and
-- retired (kind flips to outdated, freshness ages) over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy source_records_select on source_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy source_records_insert on source_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy source_records_update on source_records
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy source_records_delete on source_records
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0044_control_tower_snapshots.sql >>>>>
-- =============================================================================
-- Migration: 0044_control_tower_snapshots.sql
-- Purpose:   Stand up the Alfy² Executive Control Tower — the operator
--            dashboard. A single `control_tower_snapshots` table stores an
--            assembled point-in-time snapshot of cash, pipeline, goals,
--            campaigns, blocked deals, risks, agent performance, approvals,
--            top priorities, business health, opportunities, workflows, and the
--            review queue.
--
-- CONTROL TOWER MODEL
--   - Each row is a single assembled dashboard render: the engine pulls the
--     operator's live state across every surface and freezes it into one
--     snapshot at `generated_at`.
--   - The snapshot is denormalized into JSONB sections so the dashboard can be
--     served as-rendered without re-querying every source table:
--       cash_position, revenue_pipeline, goals, active_campaigns, blocked_deals,
--       risks, agent_performance, approvals_needed, top_priorities,
--       business_health, opportunities, workflows_running, review_queue.
--   - Snapshots are IMMUTABLE point-in-time records: once written, a snapshot is
--     never edited. There is no updated_at column and no updated_at trigger —
--     history is preserved by appending new snapshots, not by mutating old ones.
--     (Immutability is enforced in 0045 via deny-by-default + no UPDATE/DELETE
--     policy, mirroring the events/audit_log treatment in 0002.)
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables — snapshots are immutable, so it is
--     deliberately omitted here.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0045_control_tower_snapshots_rls.sql. This file only defines structure; it
-- does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- control_tower_snapshots — an assembled point-in-time render of the operator
-- dashboard. Each row freezes cash, pipeline, goals, campaigns, blocked deals,
-- risks, agent performance, approvals, top priorities, business health,
-- opportunities, workflows, and the review queue into denormalized JSONB
-- sections. Immutable: no updated_at, no trigger — new state means a new
-- snapshot, never an edit.
-- -----------------------------------------------------------------------------
create table if not exists control_tower_snapshots (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  generated_at       timestamptz   not null default now(),
  cash_position      jsonb         not null default '{}'::jsonb,
  revenue_pipeline   jsonb         not null default '{}'::jsonb,
  goals              jsonb         not null default '[]'::jsonb,
  active_campaigns   jsonb         not null default '[]'::jsonb,
  blocked_deals      jsonb         not null default '[]'::jsonb,
  risks              jsonb         not null default '[]'::jsonb,
  agent_performance  jsonb         not null default '[]'::jsonb,
  approvals_needed   jsonb         not null default '[]'::jsonb,
  top_priorities     jsonb         not null default '[]'::jsonb,
  business_health    jsonb         not null default '[]'::jsonb,
  opportunities      jsonb         not null default '[]'::jsonb,
  workflows_running  jsonb         not null default '[]'::jsonb,
  review_queue       jsonb         not null default '[]'::jsonb,
  created_at         timestamptz   not null default now()
);

create index if not exists control_tower_snapshots_tenant_generated_idx
  on control_tower_snapshots (tenant_id, generated_at);

-- >>>>> 0045_control_tower_snapshots_rls.sql >>>>>
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

-- >>>>> 0046_playbooks.sql >>>>>
-- =============================================================================
-- Migration: 0046_playbooks.sql
-- Purpose:   Stand up the Alfy² Enterprise Playbook Generator — a single
--            `playbooks` table that captures, per business and per domain, the
--            reusable operating IP the operator runs the business on.
--
-- ENTERPRISE PLAYBOOK MODEL
--   - A playbook is scoped to one business and one of eleven domains:
--       sales, marketing, finance, operations, legal_risk, customer_success,
--       product, recruiting, personal_admin, health, asset_management.
--   - Each playbook bundles per business/domain SOPs, workflows, scripts,
--     checklists, onboarding/training docs, role scorecards, KPIs, escalation
--     rules, and client-facing assets — packaged as reusable IP.
--   - All of that generated material is stored as a list of `artifacts`.
--   - `business_id` is optional (a playbook may be drafted before a business row
--     exists); `business_name` is denormalized for display.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0047_playbooks_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- playbooks — a per business/domain playbook: SOPs, workflows, scripts,
-- checklists, onboarding/training docs, role scorecards, KPIs, escalation rules,
-- and client-facing assets, packaged as reusable IP in `artifacts`. Scoped to
-- one of eleven domains and (optionally) one business. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists playbooks (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null,
  domain         text        not null
                             check (domain in (
                               'sales','marketing','finance','operations',
                               'legal_risk','customer_success','product',
                               'recruiting','personal_admin','health',
                               'asset_management')),
  business_id    uuid,
  business_name  text        not null default '',
  name           text        not null,
  artifacts      jsonb       not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists playbooks_tenant_domain_idx
  on playbooks (tenant_id, domain);

create index if not exists playbooks_tenant_business_idx
  on playbooks (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for playbooks. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_playbooks on playbooks;
create trigger set_updated_at_playbooks
  before update on playbooks
  for each row execute function set_updated_at();

-- >>>>> 0047_playbooks_rls.sql >>>>>
-- =============================================================================
-- Migration: 0047_playbooks_rls.sql
-- Purpose:   Enable Row-Level Security on the Enterprise Playbook Generator
--            `playbooks` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the playbooks table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table playbooks enable row level security;

-- =============================================================================
-- playbooks — mutable: playbooks are generated, edited, and refined over time as
-- the operator's IP evolves. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy playbooks_select on playbooks
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy playbooks_insert on playbooks
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy playbooks_update on playbooks
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy playbooks_delete on playbooks
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0048_portfolio_reports.sql >>>>>
-- =============================================================================
-- Migration: 0048_portfolio_reports.sql
-- Purpose:   Stand up the Alfy² Strategic Portfolio Optimizer — a single
--            `portfolio_reports` table holding point-in-time analyses that look
--            at ALL of the operator's businesses together.
--
-- STRATEGIC PORTFOLIO OPTIMIZER MODEL
--   - Each report is a snapshot generated at a moment in time: it analyzes all
--     businesses together, ranks them across 10 dimensions, and recommends, per
--     business, whether to focus now / delegate / automate / pause / kill /
--     package for sale.
--   - `assessments` holds the per-business analysis. Each entry carries the
--     business_name, a `metrics` object across the 10 ranking dimensions, a
--     composite `score`, the `recommendation`, and the `rationale` behind it.
--   - `summary` is the cross-portfolio narrative for the snapshot.
--   - Reports are POINT-IN-TIME: once written they are not edited (no
--     updated_at, no trigger). A new analysis produces a new row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables — deliberately omitted here.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0049_portfolio_reports_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- portfolio_reports — a point-in-time strategic analysis across all of the
-- operator's businesses. Ranks each business by 10 dimensions and records a
-- per-business recommendation (focus now / delegate / automate / pause / kill /
-- package for sale) in `assessments`, with a cross-portfolio `summary`.
-- Immutable: no updated_at, no trigger — a new analysis is a new row.
-- -----------------------------------------------------------------------------
create table if not exists portfolio_reports (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  generated_at  timestamptz not null default now(),
  assessments   jsonb       not null default '[]'::jsonb,
  summary       text        not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists portfolio_reports_tenant_generated_idx
  on portfolio_reports (tenant_id, generated_at);

-- >>>>> 0049_portfolio_reports_rls.sql >>>>>
-- =============================================================================
-- Migration: 0049_portfolio_reports_rls.sql
-- Purpose:   Enable Row-Level Security on the Strategic Portfolio Optimizer
--            `portfolio_reports` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            the append-only treatment of `events` / `audit_log`.
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
-- POINT-IN-TIME / IMMUTABLE
--   `portfolio_reports` get INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing report row immutable — a report is a snapshot of a moment and
--   is never edited; a new analysis produces a new row. (Mirrors `events` /
--   `audit_log` in 0002.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on portfolio_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table portfolio_reports enable row level security;

-- =============================================================================
-- portfolio_reports — POINT-IN-TIME. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report row immutable.
-- =============================================================================
create policy portfolio_reports_select on portfolio_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy portfolio_reports_insert on portfolio_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0050_ingested_items.sql >>>>>
-- =============================================================================
-- Migration: 0050_ingested_items.sql
-- Purpose:   Stand up the Alfy² Knowledge Ingestion Engine — a single
--            `ingested_items` table that processes anything the operator
--            uploads or saves into structured, actionable knowledge.
--
-- KNOWLEDGE INGESTION MODEL
--   The engine ingests anything uploaded or saved — books, PDFs, YouTube/podcast
--   transcripts, courses, articles, screenshots, notes, videos, github repos, and
--   competitor pages (`source_type`) — and processes each into:
--     - a `summary` of the material;
--     - the `frameworks` and `tactics` it teaches;
--     - `business_applications` (how it can be used) and `applies_to` (which
--       business it applies to);
--     - `monetization_use_cases` (ways to turn it into revenue);
--     - `suggested_sops` and `suggested_agents` it implies building;
--     - an Asset Library reference (`asset_id`) for the stored source; and
--     - links back to the operator's `linked_goals`, `linked_campaigns`, and
--       `linked_businesses`.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0051_ingested_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ingested_items — a single piece of knowledge the operator uploaded or saved,
-- processed by the ingestion engine into a summary, the frameworks and tactics
-- it teaches, business applications, which business it applies to, monetization
-- use cases, suggested SOPs/agents, an Asset Library reference, and links back to
-- goals/campaigns/businesses. One of eleven source types. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists ingested_items (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  source_type             text              not null
                                            check (source_type in (
                                              'book','pdf','youtube_transcript','podcast',
                                              'course','article','screenshot','note','video',
                                              'github_repo','competitor_page')),
  title                   text              not null,
  location                text              not null default '',
  summary                 text              not null default '',
  frameworks              jsonb             not null default '[]'::jsonb,
  tactics                 jsonb             not null default '[]'::jsonb,
  business_applications   jsonb             not null default '[]'::jsonb,
  applies_to              jsonb             not null default '[]'::jsonb,
  monetization_use_cases  jsonb             not null default '[]'::jsonb,
  suggested_sops          jsonb             not null default '[]'::jsonb,
  suggested_agents        jsonb             not null default '[]'::jsonb,
  asset_id                text,
  linked_goals            jsonb             not null default '[]'::jsonb,
  linked_campaigns        jsonb             not null default '[]'::jsonb,
  linked_businesses       jsonb             not null default '[]'::jsonb,
  created_at              timestamptz       not null default now(),
  updated_at              timestamptz
);

create index if not exists ingested_items_tenant_source_type_idx
  on ingested_items (tenant_id, source_type);

-- -----------------------------------------------------------------------------
-- updated_at trigger for ingested_items. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_ingested_items on ingested_items;
create trigger set_updated_at_ingested_items
  before update on ingested_items
  for each row execute function set_updated_at();

-- >>>>> 0051_ingested_items_rls.sql >>>>>
-- =============================================================================
-- Migration: 0051_ingested_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Knowledge Ingestion Engine
--            `ingested_items` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the ingested_items table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table ingested_items enable row level security;

-- =============================================================================
-- ingested_items — mutable: items are ingested, reprocessed, re-linked, and
-- removed over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy ingested_items_select on ingested_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ingested_items_insert on ingested_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ingested_items_update on ingested_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ingested_items_delete on ingested_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0052_knowledge_actions.sql >>>>>
-- =============================================================================
-- Migration: 0052_knowledge_actions.sql
-- Purpose:   Stand up the Alfy² Knowledge-to-Action Converter — a single
--            `knowledge_actions` table that turns every useful idea into a
--            concrete, ownable action item.
--
-- KNOWLEDGE-TO-ACTION MODEL
--   Each useful `idea` is converted into an `action_item` carrying everything
--   needed to execute it:
--     - the `business_use_case` it serves;
--     - an `implementation_plan` (the steps to ship it);
--     - a `revenue_hypothesis` (why it makes money);
--     - the `required_assets` and `required_agents` it depends on;
--     - a `test_plan` to validate it;
--     - an `owner` (defaults to the operator) and a `deadline`;
--     - a `dashboard_card` reference for surfacing it.
--   Every idea is given a `disposition` — use_now, save_for_later, ignore, or
--   convert_to_campaign — and its reusable IP is captured as an
--   `operating_manual` so the play can be run again.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0053_knowledge_actions_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- knowledge_actions — a useful idea converted into an action item, with its
-- business use case, implementation plan, revenue hypothesis, required
-- assets/agents, test plan, owner, deadline, and dashboard card. Carries a
-- disposition (use_now/save_for_later/ignore/convert_to_campaign) and a reusable
-- IP operating manual. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists knowledge_actions (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  idea                  text              not null,
  action_item           text              not null,
  business_use_case     text              not null default '',
  implementation_plan   jsonb             not null default '[]'::jsonb,
  revenue_hypothesis    text              not null default '',
  required_assets       jsonb             not null default '[]'::jsonb,
  required_agents       jsonb             not null default '[]'::jsonb,
  test_plan             jsonb             not null default '[]'::jsonb,
  owner                 text              not null default 'owner',
  deadline              timestamptz,
  dashboard_card        text              not null default '',
  disposition           text              not null
                                          check (disposition in (
                                            'use_now','save_for_later','ignore','convert_to_campaign')),
  operating_manual      text              not null default '',
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz
);

create index if not exists knowledge_actions_tenant_disposition_idx
  on knowledge_actions (tenant_id, disposition);

-- -----------------------------------------------------------------------------
-- updated_at trigger for knowledge_actions. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_knowledge_actions on knowledge_actions;
create trigger set_updated_at_knowledge_actions
  before update on knowledge_actions
  for each row execute function set_updated_at();

-- >>>>> 0053_knowledge_actions_rls.sql >>>>>
-- =============================================================================
-- Migration: 0053_knowledge_actions_rls.sql
-- Purpose:   Enable Row-Level Security on the Knowledge-to-Action Converter
--            `knowledge_actions` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the knowledge_actions table (deny-by-default until policies
-- are added).
-- -----------------------------------------------------------------------------
alter table knowledge_actions enable row level security;

-- =============================================================================
-- knowledge_actions — mutable: action items are created, owned, scheduled,
-- re-dispositioned, and removed over time. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy knowledge_actions_select on knowledge_actions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_actions_insert on knowledge_actions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_actions_update on knowledge_actions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowledge_actions_delete on knowledge_actions
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0054_conversion_profiles.sql >>>>>
-- =============================================================================
-- Migration: 0054_conversion_profiles.sql
-- Purpose:   Stand up the Alfy² Conversion Engine — a single
--            `conversion_profiles` table that tracks and improves conversion
--            across the operator's 11 conversion surfaces. Implements the
--            Conversion Engine on top of the tenant-scoped platform.
--
-- CONVERSION ENGINE MODEL
--   - The engine tracks and improves conversion across 11 surfaces, and keeps
--     one profile per business it is optimizing.
--   - Each profile maintains the business baseline — `baseline_conversion` and
--     `baseline_revenue_per_unit_usd` — that every test is measured against.
--   - `active_tests` holds the experiments currently in flight; `winning_copy`
--     and `losing_copy` accumulate the copy the engine has proven out (or ruled
--     out); `objections` records the objections the engine is working to defuse;
--     and `best_offers` holds the offers that have converted best so far.
--   - `next_optimization` names the single highest-leverage move the engine will
--     make next.
--   - The engine optimizes for REVENUE, not vanity metrics: `revenue_focused`
--     is true by default, anchoring every decision on revenue impact rather than
--     surface-level engagement.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0055_conversion_profiles_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- conversion_profiles — the Conversion Engine's per-business profile. Maintains
-- the business baseline (conversion + revenue per unit), the active tests in
-- flight, the winning/losing copy proven out over time, the objections being
-- defused, the best-converting offers, and the next optimization to run. The
-- engine optimizes for revenue, not vanity — revenue_focused is true by default.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists conversion_profiles (
  id                            uuid              primary key default gen_random_uuid(),
  tenant_id                     uuid              not null,
  business_id                   uuid,
  business_name                 text              not null,
  baseline_conversion           double precision  not null default 0,
  baseline_revenue_per_unit_usd double precision  not null default 0,
  active_tests                  jsonb             not null default '[]'::jsonb,
  winning_copy                  jsonb             not null default '[]'::jsonb,
  losing_copy                   jsonb             not null default '[]'::jsonb,
  objections                    jsonb             not null default '[]'::jsonb,
  best_offers                   jsonb             not null default '[]'::jsonb,
  next_optimization             text              not null default '',
  revenue_focused               boolean           not null default true,
  created_at                    timestamptz       not null default now(),
  updated_at                    timestamptz,
  unique (tenant_id, business_name)
);

create index if not exists conversion_profiles_tenant_business_idx
  on conversion_profiles (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for conversion_profiles. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_conversion_profiles on conversion_profiles;
create trigger set_updated_at_conversion_profiles
  before update on conversion_profiles
  for each row execute function set_updated_at();

-- >>>>> 0055_conversion_profiles_rls.sql >>>>>
-- =============================================================================
-- Migration: 0055_conversion_profiles_rls.sql
-- Purpose:   Enable Row-Level Security on the Conversion Engine
--            `conversion_profiles` table with a DENY-BY-DEFAULT posture, then
--            add tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the conversion_profiles table (deny-by-default until policies
-- are added).
-- -----------------------------------------------------------------------------
alter table conversion_profiles enable row level security;

-- =============================================================================
-- conversion_profiles — mutable: profiles are created, baselines are tracked,
-- tests/copy/objections/offers accumulate, and the next optimization is updated
-- over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy conversion_profiles_select on conversion_profiles
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy conversion_profiles_insert on conversion_profiles
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy conversion_profiles_update on conversion_profiles
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy conversion_profiles_delete on conversion_profiles
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0056_follow_ups.sql >>>>>
-- =============================================================================
-- Migration: 0056_follow_ups.sql
-- Purpose:   Stand up the Alfy² Follow-Up Execution Engine — a single
--            `follow_ups` table that drives the operator's follow-up loop across
--            every entity that needs chasing. Implements the Follow-Up Execution
--            Engine on top of the tenant-scoped platform.
--
-- FOLLOW-UP EXECUTION MODEL
--   - The engine tracks follow-ups across 9 entity kinds:
--       lead, warm_contact, deal, vendor, investor, client, partner,
--       unanswered_email, stale_opportunity.
--   - Each follow-up runs a `sequence` of touches, tracks reminders, and lands
--     in an approval queue first: a follow-up starts at status
--     'pending_approval' and only begins executing once approved.
--   - `no_response_policy` ('escalate' by default) governs what happens when a
--     touch goes unanswered, and `reactivation` flags follow-ups that re-engage
--     a dormant entity.
--   - Once APPROVED, the engine keeps going on its own — advancing
--     `current_step`, stamping `last_touch_at`, and scheduling `next_touch_at` —
--     until one of these stops it:
--       response_received, goal_reached, sequence_completed, risk, paused,
--       manual.
--     `status` carries the lifecycle (pending_approval → active → paused/
--     completed/stopped) and `stop_reason` records WHY a follow-up stopped.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0057_follow_ups_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- follow_ups — a follow-up the engine is executing against one of 9 entity
-- kinds. Runs a sequence of touches through an approval queue, then (once
-- approved) keeps going on autopilot — advancing current_step, stamping
-- last_touch_at, scheduling next_touch_at — until a stop condition fires. The
-- status carries the lifecycle and stop_reason records why it stopped. The
-- no_response_policy governs unanswered touches; reactivation flags dormant
-- re-engagement. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists follow_ups (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  entity_kind         text              not null
                                        check (entity_kind in (
                                          'lead','warm_contact','deal','vendor','investor',
                                          'client','partner','unanswered_email','stale_opportunity')),
  entity_name         text              not null,
  business_id         uuid,
  goal_id             uuid,
  sequence            jsonb             not null default '[]'::jsonb,
  current_step        integer           not null default 0,
  status              text              not null default 'pending_approval'
                                        check (status in (
                                          'pending_approval','active','paused','completed','stopped')),
  stop_reason         text              check (stop_reason in (
                                          'response_received','goal_reached','sequence_completed',
                                          'risk','paused','manual')),
  no_response_policy  text              not null default 'escalate',
  reactivation        boolean           not null default false,
  last_touch_at       timestamptz,
  next_touch_at       timestamptz,
  created_at          timestamptz       not null default now(),
  updated_at          timestamptz
);

create index if not exists follow_ups_tenant_status_idx
  on follow_ups (tenant_id, status);

create index if not exists follow_ups_tenant_entity_kind_idx
  on follow_ups (tenant_id, entity_kind);

create index if not exists follow_ups_tenant_next_touch_idx
  on follow_ups (tenant_id, next_touch_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for follow_ups. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_follow_ups on follow_ups;
create trigger set_updated_at_follow_ups
  before update on follow_ups
  for each row execute function set_updated_at();

-- >>>>> 0057_follow_ups_rls.sql >>>>>
-- =============================================================================
-- Migration: 0057_follow_ups_rls.sql
-- Purpose:   Enable Row-Level Security on the Follow-Up Execution Engine
--            `follow_ups` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the follow_ups table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table follow_ups enable row level security;

-- =============================================================================
-- follow_ups — mutable: follow-ups are created, approved, executed, advanced,
-- paused, stopped, and completed over time. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy follow_ups_select on follow_ups
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy follow_ups_insert on follow_ups
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy follow_ups_update on follow_ups
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy follow_ups_delete on follow_ups
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0058_revenue_intel.sql >>>>>
-- =============================================================================
-- Migration: 0058_revenue_intel.sql
-- Purpose:   Stand up the Alfy² Revenue Command System — a single `revenue_intel`
--            table that stores computed revenue intelligence per business: the
--            fastest path to cash, the easiest offer to sell, the best lead
--            source, the highest-ROI campaign, stuck deals, and the next money
--            action. Implements Revenue Command on top of the tenant-scoped
--            platform.
--
-- REVENUE COMMAND MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SNAPSHOT for one business: the engine
--     analyzes the operator's revenue surface and writes the conclusions out as a
--     dated snapshot (`generated_at`).
--   - The snapshot answers the operator's money questions directly:
--       fastest_path_to_cash, easiest_offer_to_sell, best_lead_source,
--       highest_roi_campaign, next_money_action.
--   - `stuck_deals` holds the deals the engine flagged as stalled, and
--     `weighted_pipeline_usd` / `revenue_goal_usd` frame the snapshot against the
--     operator's target.
--   - Snapshots are IMMUTABLE: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new snapshots rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0059_revenue_intel_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- revenue_intel — a computed point-in-time revenue snapshot for one business.
-- Holds the fastest path to cash, easiest offer to sell, best lead source,
-- highest-ROI campaign, stuck deals, and next money action, framed against the
-- weighted pipeline and revenue goal. Immutable (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists revenue_intel (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  business_name          text              not null,
  generated_at           timestamptz       not null default now(),
  fastest_path_to_cash   text              not null default '',
  easiest_offer_to_sell  text              not null default '',
  best_lead_source       text              not null default '',
  highest_roi_campaign   text              not null default '',
  stuck_deals            jsonb             not null default '[]'::jsonb,
  next_money_action      text              not null default '',
  weighted_pipeline_usd  double precision  not null default 0,
  revenue_goal_usd       double precision  not null default 0,
  created_at             timestamptz       not null default now()
);

create index if not exists revenue_intel_tenant_business_idx
  on revenue_intel (tenant_id, business_name);

-- >>>>> 0059_revenue_intel_rls.sql >>>>>
-- =============================================================================
-- Migration: 0059_revenue_intel_rls.sql
-- Purpose:   Enable Row-Level Security on the Revenue Command `revenue_intel`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
-- POINT-IN-TIME / IMMUTABLE
--   `revenue_intel` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing snapshot immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on revenue_intel (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table revenue_intel enable row level security;

-- =============================================================================
-- revenue_intel — POINT-IN-TIME / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing snapshot immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy revenue_intel_select on revenue_intel
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy revenue_intel_insert on revenue_intel
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0060_sales_asset_packs.sql >>>>>
-- =============================================================================
-- Migration: 0060_sales_asset_packs.sql
-- Purpose:   Stand up the Alfy² Sales Asset Generator — a single
--            `sales_asset_packs` table that holds the generated sales assets for
--            a business, saved to the Asset Library. Implements the Sales Asset
--            Generator on top of the tenant-scoped platform.
--
-- SALES ASSET GENERATOR MODEL
--   - For a given business, the engine generates 12 sales asset kinds:
--       one-pager, pitch deck, investor deck, sales deck, proposal,
--       email sequence, DM script, call script, objection handling, FAQ,
--       case study template, onboarding packet.
--   - The generated assets are stored on `assets` (a JSONB array) and the whole
--     pack is saved to the operator's Asset Library for reuse.
--   - A pack is mutable: assets are regenerated and refreshed over time, so
--     `updated_at` is maintained by the shared trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0061_sales_asset_packs_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sales_asset_packs — the generated sales assets for one business, saved to the
-- Asset Library. `assets` holds the 12 generated asset kinds. Mutable: packs are
-- regenerated and refreshed over time.
-- -----------------------------------------------------------------------------
create table if not exists sales_asset_packs (
  id             uuid              primary key default gen_random_uuid(),
  tenant_id      uuid              not null,
  business_id    uuid,
  business_name  text              not null,
  assets         jsonb             not null default '[]'::jsonb,
  created_at     timestamptz       not null default now(),
  updated_at     timestamptz
);

create index if not exists sales_asset_packs_tenant_business_idx
  on sales_asset_packs (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for sales_asset_packs. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_sales_asset_packs on sales_asset_packs;
create trigger set_updated_at_sales_asset_packs
  before update on sales_asset_packs
  for each row execute function set_updated_at();

-- >>>>> 0061_sales_asset_packs_rls.sql >>>>>
-- =============================================================================
-- Migration: 0061_sales_asset_packs_rls.sql
-- Purpose:   Enable Row-Level Security on the Sales Asset Generator
--            `sales_asset_packs` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on sales_asset_packs (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table sales_asset_packs enable row level security;

-- =============================================================================
-- sales_asset_packs — mutable: packs are generated, regenerated, and refreshed
-- over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy sales_asset_packs_select on sales_asset_packs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sales_asset_packs_insert on sales_asset_packs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sales_asset_packs_update on sales_asset_packs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sales_asset_packs_delete on sales_asset_packs
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0062_queue_items.sql >>>>>
-- =============================================================================
-- Migration: 0062_queue_items.sql
-- Purpose:   Stand up the Alfy² Execution Queue — a single `queue_items` table
--            that captures everything competing for the operator's attention so
--            the system always knows what to do next. Implements the Execution
--            Queue on top of the tenant-scoped platform.
--
-- EXECUTION QUEUE MODEL
--   - Every item lands in one of 8 BUCKETS:
--       idea, task, approved_action, blocked_action, waiting_on_alyssa,
--       automated_workflow, money_action, risk_action.
--   - Every item carries one of 7 PRIORITY CATEGORIES, ordered highest → lowest:
--       revenue > risk > deadline > follow_up > operations > personal_admin
--       > nice_to_have.
--   - `value_usd` and `due` let the engine rank within a category; `actionable`
--     marks whether the item can be worked now, and `done` closes it out.
--   - The queue is mutable: items are created, re-bucketed, re-prioritized, and
--     completed over time, so `updated_at` is maintained by the shared trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0063_queue_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- queue_items — a single thing competing for the operator's attention, sorted
-- into one of 8 buckets and one of 7 priority categories. Carries value, due
-- date, and actionable/done flags so the engine always knows what to do next.
-- Mutable: items are re-bucketed, re-prioritized, and completed over time.
-- -----------------------------------------------------------------------------
create table if not exists queue_items (
  id           uuid              primary key default gen_random_uuid(),
  tenant_id    uuid              not null,
  bucket       text              not null
                                 check (bucket in (
                                   'idea','task','approved_action','blocked_action',
                                   'waiting_on_alyssa','automated_workflow',
                                   'money_action','risk_action')),
  category     text              not null
                                 check (category in (
                                   'revenue','risk','deadline','follow_up',
                                   'operations','personal_admin','nice_to_have')),
  title        text              not null,
  business_id  uuid,
  value_usd    double precision  not null default 0,
  due          timestamptz,
  actionable   boolean           not null default true,
  done         boolean           not null default false,
  created_at   timestamptz       not null default now(),
  updated_at   timestamptz
);

create index if not exists queue_items_tenant_bucket_idx
  on queue_items (tenant_id, bucket);

create index if not exists queue_items_tenant_category_idx
  on queue_items (tenant_id, category);

create index if not exists queue_items_tenant_done_idx
  on queue_items (tenant_id, done);

-- -----------------------------------------------------------------------------
-- updated_at trigger for queue_items. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_queue_items on queue_items;
create trigger set_updated_at_queue_items
  before update on queue_items
  for each row execute function set_updated_at();

-- >>>>> 0063_queue_items_rls.sql >>>>>
-- =============================================================================
-- Migration: 0063_queue_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Execution Queue `queue_items`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on queue_items (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table queue_items enable row level security;

-- =============================================================================
-- queue_items — mutable: items are created, re-bucketed, re-prioritized, and
-- completed over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy queue_items_select on queue_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy queue_items_insert on queue_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy queue_items_update on queue_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy queue_items_delete on queue_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0064_dropped_items.sql >>>>>
-- =============================================================================
-- Migration: 0064_dropped_items.sql
-- Purpose:   Stand up the Alfy² "Don't Drop the Ball" System — a single
--            `dropped_items` table that tracks the things slipping through the
--            cracks across the operator's businesses. Implements the Don't Drop
--            the Ball System on top of the tenant-scoped platform.
--
-- DON'T DROP THE BALL MODEL
--   - The engine detects items that have gone past their per-kind staleness
--     thresholds and surfaces them so nothing is silently dropped:
--       forgotten_lead, missed_follow_up, unfinished_launch, abandoned_idea,
--       stale_campaign, unpaid_invoice, unsigned_contract, open_loop,
--       waiting_on_response.
--   - Detected items are surfaced DAILY for the operator to review. Each item
--     carries the business it belongs to, how long it has been sitting
--     (`age_days`), the dollars at stake (`value_usd`), and the engine's
--     `recommended_action` to close the loop.
--   - An item moves through a lifecycle:
--       open → assigned → closed (or dismissed).
--   - Once APPROVED, an agent is assigned (`assigned_agent`) to close the loop —
--     the item flips to 'assigned' and the agent drives it to 'closed'.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0065_dropped_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- dropped_items — a forgotten lead, missed follow-up, unfinished launch,
-- abandoned idea, stale campaign, unpaid invoice, unsigned contract, open loop,
-- or waiting-on response that has gone past its per-kind staleness threshold.
-- Detected daily, scoped to a business, scored by age and value, and carrying a
-- recommended action. Moves open → assigned → closed (or dismissed); once
-- approved an agent is assigned to close the loop. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists dropped_items (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  kind                text              not null
                                        check (kind in (
                                          'forgotten_lead','missed_follow_up',
                                          'unfinished_launch','abandoned_idea',
                                          'stale_campaign','unpaid_invoice',
                                          'unsigned_contract','open_loop',
                                          'waiting_on_response')),
  title               text              not null,
  business_id         uuid,
  business_name       text              not null default '',
  age_days            integer           not null default 0,
  value_usd           double precision  not null default 0,
  status              text              not null default 'open'
                                        check (status in (
                                          'open','assigned','closed','dismissed')),
  assigned_agent      text,
  recommended_action  text              not null default '',
  detected_at         timestamptz       not null default now(),
  updated_at          timestamptz
);

create index if not exists dropped_items_tenant_status_idx
  on dropped_items (tenant_id, status);

create index if not exists dropped_items_tenant_kind_idx
  on dropped_items (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- updated_at trigger for dropped_items. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_dropped_items on dropped_items;
create trigger set_updated_at_dropped_items
  before update on dropped_items
  for each row execute function set_updated_at();

-- >>>>> 0065_dropped_items_rls.sql >>>>>
-- =============================================================================
-- Migration: 0065_dropped_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Don't Drop the Ball System
--            `dropped_items` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the dropped_items table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table dropped_items enable row level security;

-- =============================================================================
-- dropped_items — mutable: items are detected, assigned, closed, and dismissed
-- over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy dropped_items_select on dropped_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy dropped_items_insert on dropped_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy dropped_items_update on dropped_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy dropped_items_delete on dropped_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0066_asset_checklists.sql >>>>>
-- =============================================================================
-- Migration: 0066_asset_checklists.sql
-- Purpose:   Stand up the Alfy² Business Asset Checklist feature — a single
--            `asset_checklists` table that tracks whether each business has its
--            key assets in place. Implements the Business Asset Checklist on top
--            of the tenant-scoped platform.
--
-- BUSINESS ASSET CHECKLIST MODEL
--   - Each business is scored against its 25 key assets:
--       logo, domain, email, landing page, social pages, decks, one-pager,
--       pricing, offer, CRM, templates, scripts, onboarding packet, contracts,
--       NDA, terms, privacy policy, SOPs, analytics, payment links, lead list,
--       follow-up sequence, content calendar (plus the remaining key assets).
--   - `present` and `missing` hold the asset kinds the business has and lacks;
--     `completeness` is the fraction in [0,1] of the 25 assets present.
--   - The engine recommends the single fastest asset to create next in
--     `recommended_next` (one of the 25 asset kinds, or null when complete),
--     with the rationale in `recommendation_reason`.
--   - One checklist per business per tenant — uniqueness on (tenant_id,
--     business_name).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0067_asset_checklists_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- asset_checklists — the asset-completeness state for one business: which of the
-- 25 key assets are present, which are missing, the overall completeness
-- fraction, and the engine's recommendation for the fastest asset to create
-- next. One row per business per tenant. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists asset_checklists (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  business_id            uuid,
  business_name          text              not null,
  present                jsonb             not null default '[]'::jsonb,
  missing                jsonb             not null default '[]'::jsonb,
  completeness           double precision  not null default 0
                                           check (completeness >= 0 and completeness <= 1),
  recommended_next       text,
  recommendation_reason  text              not null default '',
  created_at             timestamptz       not null default now(),
  updated_at             timestamptz,
  unique (tenant_id, business_name)
);

create index if not exists asset_checklists_tenant_business_idx
  on asset_checklists (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for asset_checklists. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_asset_checklists on asset_checklists;
create trigger set_updated_at_asset_checklists
  before update on asset_checklists
  for each row execute function set_updated_at();

-- >>>>> 0067_asset_checklists_rls.sql >>>>>
-- =============================================================================
-- Migration: 0067_asset_checklists_rls.sql
-- Purpose:   Enable Row-Level Security on the Business Asset Checklist
--            `asset_checklists` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the asset_checklists table (deny-by-default until policies
-- added).
-- -----------------------------------------------------------------------------
alter table asset_checklists enable row level security;

-- =============================================================================
-- asset_checklists — mutable: a business's asset completeness is recomputed and
-- its recommendation updated over time. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy asset_checklists_select on asset_checklists
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_checklists_insert on asset_checklists
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_checklists_update on asset_checklists
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_checklists_delete on asset_checklists
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0068_money_first_mode.sql >>>>>
-- =============================================================================
-- Migration: 0068_money_first_mode.sql
-- Purpose:   Stand up the Alfy² Money-First Operating Mode — a single
--            `money_first_mode` table that holds one mode-state row per tenant.
--            Implements Money-First Operating Mode on top of the tenant-scoped
--            platform.
--
-- MONEY-FIRST OPERATING MODE
--   When ACTIVE, Alfy² prioritizes ONLY cash-moving activities:
--       cash collection, sales, follow-up, booked calls, proposals, invoices,
--       high-conversion content, warm relationships, low-friction offers.
--   And DEPRIORITIZES everything that does not move money:
--       perfection, branding polish, unnecessary features, low-conversion ideas,
--       and research without action.
--
--   - One mode-state row per tenant (unique on tenant_id). `active` toggles the
--     mode on/off; `activated_at` stamps when the mode was last switched on.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural/state snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0069_money_first_mode_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- money_first_mode — the Money-First Operating Mode state for a tenant. One row
-- per tenant (unique on tenant_id). When `active`, Alfy² prioritizes only
-- cash-moving activities and deprioritizes perfection, polish, unnecessary
-- features, low-conversion ideas, and research without action. `activated_at`
-- stamps when the mode was last switched on. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists money_first_mode (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  active        boolean     not null default false,
  activated_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (tenant_id)
);

-- -----------------------------------------------------------------------------
-- updated_at trigger for money_first_mode. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_money_first_mode on money_first_mode;
create trigger set_updated_at_money_first_mode
  before update on money_first_mode
  for each row execute function set_updated_at();

-- >>>>> 0069_money_first_mode_rls.sql >>>>>
-- =============================================================================
-- Migration: 0069_money_first_mode_rls.sql
-- Purpose:   Enable Row-Level Security on the Money-First Operating Mode
--            `money_first_mode` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the money_first_mode table (deny-by-default until policies are
-- added).
-- -----------------------------------------------------------------------------
alter table money_first_mode enable row level security;

-- =============================================================================
-- money_first_mode — mutable: the mode is toggled on/off over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy money_first_mode_select on money_first_mode
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy money_first_mode_insert on money_first_mode
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy money_first_mode_update on money_first_mode
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy money_first_mode_delete on money_first_mode
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0070_vault_entries.sql >>>>>
-- =============================================================================
-- Migration: 0070_vault_entries.sql
-- Purpose:   Stand up the Alfy² Knowledge Vault — a single `vault_entries` table
--            where every dropped item becomes extracted intelligence and then
--            execution. Implements the Knowledge Vault on top of the
--            tenant-scoped platform.
--
-- KNOWLEDGE VAULT MODEL
--   - The operator drops ANY of 13 input kinds into the vault:
--       book, pdf, youtube_transcript, podcast, course, screenshot, website,
--       github_repo, article, competitor_page, voice_note, meeting_notes,
--       random_idea.
--   - Each dropped item is processed into EXTRACTED INTELLIGENCE held on
--     `extraction`: key ideas, frameworks, tactics, quotes, examples, business
--     applications, monetization opportunities, related businesses, related
--     agents, related assets, and action items.
--   - The entry carries a generated `summary` and an `asset_id` pointing at the
--     produced asset, and tracks how the knowledge converts into execution:
--     `converted_to_actions` counts the actions spawned, and
--     `linked_business_ids` ties the entry to the businesses it feeds.
--   - The mission is the chain it drives:
--       knowledge → asset → campaign → conversation → conversion → cash.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0071_vault_entries_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- vault_entries — one dropped item (one of 13 input kinds) turned into extracted
-- intelligence (key ideas, frameworks, tactics, quotes, examples, business
-- applications, monetization opportunities, related businesses/agents/assets,
-- action items) on `extraction`, plus a generated summary and the produced
-- asset. Tracks conversion into execution via converted_to_actions and the
-- businesses it feeds via linked_business_ids. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists vault_entries (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  kind                  text              not null
                                          check (kind in (
                                            'book','pdf','youtube_transcript',
                                            'podcast','course','screenshot',
                                            'website','github_repo','article',
                                            'competitor_page','voice_note',
                                            'meeting_notes','random_idea')),
  title                 text              not null,
  summary               text              not null default '',
  extraction            jsonb             not null default '{}'::jsonb,
  asset_id              text              not null,
  converted_to_actions  integer           not null default 0,
  linked_business_ids   jsonb             not null default '[]'::jsonb,
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz
);

create index if not exists vault_entries_tenant_kind_idx
  on vault_entries (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- updated_at trigger for vault_entries. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_vault_entries on vault_entries;
create trigger set_updated_at_vault_entries
  before update on vault_entries
  for each row execute function set_updated_at();

-- >>>>> 0071_vault_entries_rls.sql >>>>>
-- =============================================================================
-- Migration: 0071_vault_entries_rls.sql
-- Purpose:   Enable Row-Level Security on the Knowledge Vault `vault_entries`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on vault_entries (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table vault_entries enable row level security;

-- =============================================================================
-- vault_entries — mutable: entries are created, re-extracted, summarized,
-- and updated as they convert into execution. select/insert/update/delete,
-- all tenant-scoped.
-- =============================================================================
create policy vault_entries_select on vault_entries
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy vault_entries_insert on vault_entries
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy vault_entries_update on vault_entries
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy vault_entries_delete on vault_entries
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0072_revenue_factory_reports.sql >>>>>
-- =============================================================================
-- Migration: 0072_revenue_factory_reports.sql
-- Purpose:   Stand up the Alfy² Revenue Factory — a single
--            `revenue_factory_reports` table that is the per-business money
--            cockpit answering one question: "what do we do today to make
--            money?". Implements the Revenue Factory on top of the
--            tenant-scoped platform.
--
-- REVENUE FACTORY MODEL
--   - Each row is an APPEND-ONLY DAILY DIRECTIVE SNAPSHOT for one business: the
--     engine computes the day's money cockpit and writes it out dated
--     (`generated_at`).
--   - The snapshot answers the operator's money questions directly:
--       fastest_path_to_cash, easiest_offer_to_sell, best_warm_contact,
--       lowest_effort_revenue_action, highest_value_follow_up,
--       offer_most_likely_to_convert, and the single todays_money_move.
--   - It frames the day with pipeline counts and value: warm_lead_count,
--     cold_lead_count, referral_source_count, open_proposal_value_usd.
--   - Snapshots are APPEND-ONLY: a row is a recorded daily directive, not edited
--     in place. There is no updated_at and no trigger — successive computations
--     append new snapshots rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0073_revenue_factory_reports_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- revenue_factory_reports — an append-only daily directive snapshot for one
-- business: the money cockpit answering "what do we do today to make money?".
-- Holds the fastest path to cash, easiest offer to sell, best warm contact,
-- lowest-effort revenue action, highest-value follow-up, the offer most likely
-- to convert, and today's single money move, framed by warm/cold/referral lead
-- counts and open proposal value. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists revenue_factory_reports (
  id                            uuid              primary key default gen_random_uuid(),
  tenant_id                     uuid              not null,
  business_id                   uuid,
  business_name                 text              not null,
  fastest_path_to_cash          text              not null default '',
  easiest_offer_to_sell         text,
  best_warm_contact             text,
  lowest_effort_revenue_action  text,
  highest_value_follow_up       text,
  offer_most_likely_to_convert  text,
  todays_money_move             text              not null,
  warm_lead_count               integer           not null default 0,
  cold_lead_count               integer           not null default 0,
  referral_source_count         integer           not null default 0,
  open_proposal_value_usd       double precision  not null default 0,
  generated_at                  timestamptz       not null default now(),
  created_at                    timestamptz       not null default now()
);

create index if not exists revenue_factory_reports_tenant_business_idx
  on revenue_factory_reports (tenant_id, business_id);

-- >>>>> 0073_revenue_factory_reports_rls.sql >>>>>
-- =============================================================================
-- Migration: 0073_revenue_factory_reports_rls.sql
-- Purpose:   Enable Row-Level Security on the Revenue Factory
--            `revenue_factory_reports` table with a DENY-BY-DEFAULT posture,
--            then add tenant-isolation policies. Mirrors the tenancy model from
--            0002 and the append-only posture from 0059.
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
-- APPEND-ONLY
--   `revenue_factory_reports` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing daily snapshot immutable — no caller can mutate or remove it.
--   This matches the append-only posture of `revenue_intel` in 0059 and of
--   `events` + `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on revenue_factory_reports (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table revenue_factory_reports enable row level security;

-- =============================================================================
-- revenue_factory_reports — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing daily snapshot immutable, matching revenue_intel in 0059.
-- =============================================================================
create policy revenue_factory_reports_select on revenue_factory_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy revenue_factory_reports_insert on revenue_factory_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0074_war_room_tests.sql >>>>>
-- =============================================================================
-- Migration: 0074_war_room_tests.sql
-- Purpose:   Stand up the Alfy² Conversion War Room — a single `war_room_tests`
--            table that drives full-funnel A/B testing across the operator's
--            conversion surfaces. Implements the Conversion War Room on top of
--            the tenant-scoped platform.
--
-- CONVERSION WAR ROOM MODEL
--   - Nine surfaces span the full conversion funnel:
--       cold_email, social_post, landing_page, dm, sales_script, deck,
--       proposal, checkout_flow, follow_up_sequence.
--   - Every test pits a variant pair against each other — `variant_a_label`
--     and `variant_b_label` name them, `metrics_a`/`metrics_b` hold the raw
--     measured outcomes, and `rates_a`/`rates_b` hold the derived rates.
--   - The `winner` is decided on REVENUE, booked calls, and qualified leads —
--     never vanity metrics — and is null until a test resolves. `recommendation`
--     captures the engine's next move, and `objections` records the buyer
--     objections surfaced along the funnel.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0075_war_room_tests_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- war_room_tests — a full-funnel A/B test on one of nine conversion surfaces,
-- with its variant pair, measured metrics, derived rates, recommendation, and
-- surfaced objections. The winner is decided on revenue / booked calls /
-- qualified leads (never vanity metrics) and stays null until the test
-- resolves. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists war_room_tests (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  business_id       uuid,
  surface           text              not null
                                      check (surface in (
                                        'cold_email','social_post','landing_page',
                                        'dm','sales_script','deck','proposal',
                                        'checkout_flow','follow_up_sequence')),
  label             text              not null,
  variant_a_label   text              not null default 'A',
  variant_b_label   text              not null default 'B',
  metrics_a         jsonb             not null default '{}'::jsonb,
  metrics_b         jsonb             not null default '{}'::jsonb,
  rates_a           jsonb,
  rates_b           jsonb,
  winner            text              check (winner in ('a','b')),
  recommendation    text              not null default '',
  objections        jsonb             not null default '[]'::jsonb,
  created_at        timestamptz       not null default now(),
  updated_at        timestamptz
);

create index if not exists war_room_tests_tenant_surface_idx
  on war_room_tests (tenant_id, surface);

-- -----------------------------------------------------------------------------
-- updated_at trigger for war_room_tests. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_war_room_tests on war_room_tests;
create trigger set_updated_at_war_room_tests
  before update on war_room_tests
  for each row execute function set_updated_at();

-- >>>>> 0075_war_room_tests_rls.sql >>>>>
-- =============================================================================
-- Migration: 0075_war_room_tests_rls.sql
-- Purpose:   Enable Row-Level Security on the Conversion War Room
--            `war_room_tests` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on war_room_tests (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table war_room_tests enable row level security;

-- =============================================================================
-- war_room_tests — mutable: tests are created, run, scored, and resolved to a
-- winner over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy war_room_tests_select on war_room_tests
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy war_room_tests_insert on war_room_tests
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy war_room_tests_update on war_room_tests
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy war_room_tests_delete on war_room_tests
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0076_deals.sql >>>>>
-- =============================================================================
-- Migration: 0076_deals.sql
-- Purpose:   Stand up the Alfy² Deal Desk — a single `deals` table that drives
--            the operator's revenue execution loop. One record per opportunity,
--            ranked by probability, revenue, speed, strategic value, and effort;
--            surfaces the next money move, blocked deals, and deals likely to die.
--
-- DEAL DESK MODEL
--   - Each row is one opportunity moving through a sales lifecycle:
--       new → qualifying → proposal → negotiation → verbal → won (or lost).
--   - The desk ranks opportunities so the operator always knows the next money
--     move: `probability` (close likelihood), `deal_size_usd` (revenue),
--     `projected_close_date`/`deadline` (speed), `strategic_value`, and `effort`
--     feed the ranking.
--   - Blocked deals surface through `objections`, `missing_assets`, and
--     `next_step`; deals likely to die surface through `risk` and
--     `days_since_activity`.
--   - Relationship context — `decision_maker`, `relationship_notes`, and
--     `follow_up_status` — keeps the human signal attached to the number.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0077_deals_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- deals — one record per opportunity on the Deal Desk. Ranked by probability,
-- revenue, speed, strategic value, and effort; surfaces the next money move,
-- blocked deals (objections, missing assets), and deals likely to die (risk,
-- days_since_activity). Carries a stage lifecycle plus relationship context.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists deals (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  buyer_contact         text              not null,
  business_id           uuid,
  business_name         text              not null default '',
  offer                 text              not null,
  deal_size_usd         double precision  not null default 0,
  probability           double precision  not null default 0.5
                                          check (probability >= 0 and probability <= 1),
  stage                 text              not null default 'new'
                                          check (stage in (
                                            'new','qualifying','proposal','negotiation',
                                            'verbal','won','lost')),
  next_step             text              not null default '',
  deadline              timestamptz,
  objections            jsonb             not null default '[]'::jsonb,
  missing_assets        jsonb             not null default '[]'::jsonb,
  follow_up_status      text              not null default 'none',
  decision_maker        text              not null default '',
  relationship_notes    text              not null default '',
  risk                  double precision  not null default 0
                                          check (risk >= 0 and risk <= 1),
  days_since_activity   integer           not null default 0,
  projected_close_date  timestamptz,
  effort                double precision  not null default 0.5
                                          check (effort >= 0 and effort <= 1),
  strategic_value       double precision  not null default 0.5
                                          check (strategic_value >= 0 and strategic_value <= 1),
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz
);

create index if not exists deals_tenant_stage_idx
  on deals (tenant_id, stage);

create index if not exists deals_tenant_business_idx
  on deals (tenant_id, business_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for deals. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_deals on deals;
create trigger set_updated_at_deals
  before update on deals
  for each row execute function set_updated_at();

-- >>>>> 0077_deals_rls.sql >>>>>
-- =============================================================================
-- Migration: 0077_deals_rls.sql
-- Purpose:   Enable Row-Level Security on the Deal Desk `deals` table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002 and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the deals table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table deals enable row level security;

-- =============================================================================
-- deals — mutable: deals are created, advanced through stages, re-scored,
-- won, and lost over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy deals_select on deals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy deals_insert on deals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy deals_update on deals
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy deals_delete on deals
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0078_follow_ups_autopilot.sql >>>>>
-- =============================================================================
-- Migration: 0078_follow_ups_autopilot.sql
-- Purpose:   Extend the Alfy² Follow-Up Execution Engine (0056) into the
--            Follow-Up Autopilot — adds escalation (hand off only when human
--            judgment is needed) plus meeting_booked / deal_closed success stops.
--
-- FOLLOW-UP AUTOPILOT EXTENSION
--   - `escalation_reason` records WHY the engine handed a follow-up back to a
--     human — populated when judgment is needed rather than another automated
--     touch. Nullable: most follow-ups never escalate.
--   - `status` gains 'escalated': a follow-up paused pending human judgment.
--     (Full set: pending_approval, active, paused, completed, stopped, escalated.)
--   - `stop_reason` gains success stops 'meeting_booked' and 'deal_closed', plus
--     'escalated' and 'paused', so the autopilot can record a clean win or a
--     deliberate hand-off. (Full set: response_received, meeting_booked,
--     deal_closed, goal_reached, sequence_completed, risk, escalated, paused,
--     manual — plus NULL, which CHECK constraints already permit.)
--
-- 0056 used inline UNNAMED check constraints on `status` and `stop_reason`, so
-- Postgres assigned the conventional names `follow_ups_status_check` and
-- `follow_ups_stop_reason_check`. We drop those (if exists) and add NAMED
-- constraints back with the widened value sets.
--
-- RLS on follow_ups is unchanged (0057); this migration only widens columns.
--
-- Every statement is idempotent (add column if not exists; drop constraint if
-- exists before re-adding; guard the named re-adds).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- escalation_reason — why the engine handed off to a human. Nullable.
-- -----------------------------------------------------------------------------
alter table follow_ups add column if not exists escalation_reason text;

-- -----------------------------------------------------------------------------
-- status — widen to allow 'escalated'. Drop the inline-unnamed check from 0056
-- (conventional name follow_ups_status_check) and re-add a named constraint.
-- -----------------------------------------------------------------------------
alter table follow_ups drop constraint if exists follow_ups_status_check;
alter table follow_ups drop constraint if exists follow_ups_status_allowed;
alter table follow_ups add constraint follow_ups_status_allowed
  check (status in (
    'pending_approval','active','paused','completed','stopped','escalated'));

-- -----------------------------------------------------------------------------
-- stop_reason — widen to allow the success stops meeting_booked / deal_closed
-- plus escalated / paused. Drop the inline-unnamed check from 0056 (conventional
-- name follow_ups_stop_reason_check) and re-add a named constraint. NULL is
-- already permitted by CHECK semantics (an unstopped follow-up has no reason).
-- -----------------------------------------------------------------------------
alter table follow_ups drop constraint if exists follow_ups_stop_reason_check;
alter table follow_ups drop constraint if exists follow_ups_stop_reason_allowed;
alter table follow_ups add constraint follow_ups_stop_reason_allowed
  check (stop_reason in (
    'response_received','meeting_booked','deal_closed','goal_reached',
    'sequence_completed','risk','escalated','paused','manual'));

-- >>>>> 0079_agent_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0079_agent_evaluations.sql
-- Purpose:   Stand up the Alfy² Agent Evaluation Lab — a single
--            `agent_evaluations` table that tracks how each agent is tested and
--            scored before it is trusted with real work. Implements the
--            Evaluation Lab on top of the tenant-scoped platform.
--
-- AGENT EVALUATION LAB MODEL
--   - Every agent is put through an evaluation BEFORE it is allowed to act: it is
--     given test tasks (expected outputs, failure cases, and risk checks) stored
--     in `test_cases`, and scored on accuracy / usefulness / cost / speed /
--     reliability in `scores`.
--   - An agent passes when it clears the `pass_threshold` (0..1); `passed`
--     records the outcome of the most recent evaluation.
--   - Agents are promoted through a STAGE lifecycle as they earn trust:
--       draft → testing → limited_use → approved → production → retired.
--   - GUARDRAIL: agents get NO broad permissions until they pass evaluation.
--     `broad_permissions_allowed` stays false until an agent has demonstrably
--     passed, gating elevated access behind a real, scored evaluation.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in
-- 0080_agent_evaluations_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- agent_evaluations — one evaluation record per agent: the test cases it was run
-- against, the scores it earned (accuracy/usefulness/cost/speed/reliability),
-- whether it passed its threshold, and which stage of the trust lifecycle it
-- sits in. Broad permissions stay gated until the agent passes. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists agent_evaluations (
  id                         uuid              primary key default gen_random_uuid(),
  tenant_id                  uuid              not null,
  agent_key                  text              not null,
  stage                      text              not null default 'draft'
                                               check (stage in (
                                                 'draft','testing','limited_use',
                                                 'approved','production','retired')),
  test_cases                 jsonb             not null default '[]'::jsonb,
  scores                     jsonb,
  passed                     boolean           not null default false,
  pass_threshold             double precision  not null default 0.8
                                               check (pass_threshold >= 0 and pass_threshold <= 1),
  broad_permissions_allowed  boolean           not null default false,
  notes                      text              not null default '',
  created_at                 timestamptz       not null default now(),
  updated_at                 timestamptz,
  unique (tenant_id, agent_key)
);

create index if not exists agent_evaluations_tenant_stage_idx
  on agent_evaluations (tenant_id, stage);

-- -----------------------------------------------------------------------------
-- updated_at trigger for agent_evaluations. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_agent_evaluations on agent_evaluations;
create trigger set_updated_at_agent_evaluations
  before update on agent_evaluations
  for each row execute function set_updated_at();

-- >>>>> 0080_agent_evaluations_rls.sql >>>>>
-- =============================================================================
-- Migration: 0080_agent_evaluations_rls.sql
-- Purpose:   Enable Row-Level Security on the Agent Evaluation Lab
--            `agent_evaluations` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on agent_evaluations (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table agent_evaluations enable row level security;

-- =============================================================================
-- agent_evaluations — mutable: evaluations are created, re-run, re-scored, and
-- promoted/retired through the stage lifecycle over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy agent_evaluations_select on agent_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_evaluations_insert on agent_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_evaluations_update on agent_evaluations
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy agent_evaluations_delete on agent_evaluations
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0081_workflow_cost_reports.sql >>>>>
-- =============================================================================
-- Migration: 0081_workflow_cost_reports.sql
-- Purpose:   Stand up the Alfy² Cost & Token CFO — a single
--            `workflow_cost_reports` table that stores per-workflow cost
--            decomposition and ROI analysis. Implements the Cost CFO on top of
--            the tenant-scoped platform.
--
-- COST & TOKEN CFO MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SNAPSHOT for one workflow: the engine
--     decomposes the workflow's spend (total_cost_usd) against the value it
--     produced (value_usd) and writes the conclusions out as a dated snapshot
--     (`generated_at`).
--   - The snapshot breaks cost down to PER-UNIT economics —
--     cost_per_task, cost_per_lead, cost_per_booked_call, cost_per_sale — and
--     frames it against `roi` and `break_even_revenue_usd`.
--   - `largest_cost_category` names where the money goes (model / api /
--     automation / tool_subscription / compute / storage), and the engine emits
--     `recommendations` (cheaper model, better workflow, pause, batch, local,
--     upgrade) with a written `rationale`.
--   - Snapshots are IMMUTABLE / APPEND-ONLY: a row is a recorded computation, not
--     edited in place. There is no updated_at and no trigger — successive
--     computations append new snapshots rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0082_workflow_cost_reports_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- workflow_cost_reports — a computed point-in-time cost snapshot for one
-- workflow. Holds total cost vs value, per-unit costs (task/lead/booked
-- call/sale), ROI, break-even, the largest cost category, and the engine's
-- recommendations + rationale. Immutable (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists workflow_cost_reports (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  workflow_name            text              not null,
  business_id              uuid,
  total_cost_usd           double precision  not null default 0,
  value_usd                double precision  not null default 0,
  cost_per_task            double precision,
  cost_per_lead            double precision,
  cost_per_booked_call     double precision,
  cost_per_sale            double precision,
  roi                      double precision,
  break_even_revenue_usd   double precision  not null default 0,
  largest_cost_category    text              check (largest_cost_category in (
                                               'model','api','automation',
                                               'tool_subscription','compute','storage')),
  recommendations          jsonb             not null default '[]'::jsonb,
  rationale                text              not null default '',
  generated_at             timestamptz       not null default now()
);

create index if not exists workflow_cost_reports_tenant_workflow_idx
  on workflow_cost_reports (tenant_id, workflow_name);

-- >>>>> 0082_workflow_cost_reports_rls.sql >>>>>
-- =============================================================================
-- Migration: 0082_workflow_cost_reports_rls.sql
-- Purpose:   Enable Row-Level Security on the Cost & Token CFO
--            `workflow_cost_reports` table with a DENY-BY-DEFAULT posture, then
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
-- POINT-IN-TIME / IMMUTABLE
--   `workflow_cost_reports` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing snapshot immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `revenue_intel` in 0059.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on workflow_cost_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table workflow_cost_reports enable row level security;

-- =============================================================================
-- workflow_cost_reports — POINT-IN-TIME / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing snapshot immutable, matching revenue_intel in 0059.
-- =============================================================================
create policy workflow_cost_reports_select on workflow_cost_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_cost_reports_insert on workflow_cost_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0083_business_simulations.sql >>>>>
-- =============================================================================
-- Migration: 0083_business_simulations.sql
-- Purpose:   Stand up the Alfy² Business Simulation Engine — a single
--            `business_simulations` table that stores A-vs-B decision
--            comparisons for the operator. Implements the Simulation Engine on
--            top of the tenant-scoped platform.
--
-- BUSINESS SIMULATION ENGINE MODEL
--   - Each row is a COMPUTED POINT-IN-TIME comparison of two options for one
--     decision. Six decision KINDS span the operator's strategy surface:
--       focus_choice, campaign_choice, hire_vs_automate, pricing_choice,
--       lead_focus, build_vs_sell.
--   - The engine frames the decision as a `question`, then projects each option
--     (`option_a`, `option_b`) to best / likely / worst outcomes across revenue,
--     risk, time, and stress.
--   - It then RECOMMENDS one option (`recommendation`) with a written `reason`.
--   - Snapshots are IMMUTABLE / APPEND-ONLY: a row is a recorded computation, not
--     edited in place. There is no updated_at and no trigger — re-running a
--     simulation appends a new comparison rather than mutating an old one.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0084_business_simulations_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- business_simulations — a computed A-vs-B decision comparison. Carries the
-- decision kind, the framing question, the two options (each projected to
-- best/likely/worst on revenue/risk/time/stress), and the engine's
-- recommendation + reason. Immutable (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists business_simulations (
  id              uuid              primary key default gen_random_uuid(),
  tenant_id       uuid              not null,
  kind            text              not null
                                    check (kind in (
                                      'focus_choice','campaign_choice','hire_vs_automate',
                                      'pricing_choice','lead_focus','build_vs_sell')),
  question        text              not null default '',
  option_a        jsonb             not null default '{}'::jsonb,
  option_b        jsonb             not null default '{}'::jsonb,
  recommendation  text              not null,
  reason          text              not null,
  created_at      timestamptz       not null default now()
);

create index if not exists business_simulations_tenant_kind_idx
  on business_simulations (tenant_id, kind);

-- >>>>> 0084_business_simulations_rls.sql >>>>>
-- =============================================================================
-- Migration: 0084_business_simulations_rls.sql
-- Purpose:   Enable Row-Level Security on the Business Simulation Engine
--            `business_simulations` table with a DENY-BY-DEFAULT posture, then
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
-- POINT-IN-TIME / IMMUTABLE
--   `business_simulations` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing simulation immutable — no caller can mutate or remove it.
--   This matches the append-only posture of `revenue_intel` in 0059.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on business_simulations (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table business_simulations enable row level security;

-- =============================================================================
-- business_simulations — POINT-IN-TIME / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing simulation immutable, matching revenue_intel in 0059.
-- =============================================================================
create policy business_simulations_select on business_simulations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy business_simulations_insert on business_simulations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0085_feature_classifications.sql >>>>>
-- =============================================================================
-- Migration: 0085_feature_classifications.sql
-- Purpose:   Stand up the Alfy² FounderOS Commercialization Layer — a single
--            `feature_classifications` table that catalogs every internal
--            feature by its commercialization tier and flags the ones that
--            could one day become standalone SaaS modules.
--
-- FOUNDEROS COMMERCIALIZATION LAYER
--   - Alfy² is Tenant 001 — the first and reference tenant of FounderOS.
--   - Every internal feature is classified by a commercialization tier:
--       personal_only       — only useful to the operator; never sold.
--       business_reusable   — reusable across the operator's own businesses.
--       founder_saas_feature— a candidate to package as a SaaS feature/module.
--       agency_service      — delivered as a done-for-you agency service.
--       enterprise_product  — productized for enterprise sale.
--   - `saas_module_candidate` flags a feature as a possible standalone SaaS
--     module; `readiness` (0..1) tracks how close it is to being commercializable
--     and `rationale` records WHY a tier/candidate call was made.
--   - This is PREPARATION ONLY. `commercialized` stays false until a feature is
--     actually taken to market; nothing here is commercialized yet.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0086_feature_classifications_rls.sql. This file only defines structure; it
-- does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- feature_classifications — one internal feature, classified by commercialization
-- tier and flagged as a possible SaaS module. Carries the rationale behind the
-- call, a 0..1 readiness score, and a commercialized flag (false until actually
-- taken to market). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists feature_classifications (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  feature_name           text              not null,
  tier                   text              not null
                                           check (tier in (
                                             'personal_only','business_reusable',
                                             'founder_saas_feature','agency_service',
                                             'enterprise_product')),
  saas_module_candidate  boolean           not null default false,
  rationale              text              not null default '',
  readiness              double precision  not null default 0
                                           check (readiness >= 0 and readiness <= 1),
  commercialized         boolean           not null default false,
  created_at             timestamptz       not null default now(),
  updated_at             timestamptz,
  unique (tenant_id, feature_name)
);

create index if not exists feature_classifications_tenant_tier_idx
  on feature_classifications (tenant_id, tier);

-- -----------------------------------------------------------------------------
-- updated_at trigger for feature_classifications. Reuses set_updated_at() from
-- 0001 (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_feature_classifications on feature_classifications;
create trigger set_updated_at_feature_classifications
  before update on feature_classifications
  for each row execute function set_updated_at();

-- >>>>> 0086_feature_classifications_rls.sql >>>>>
-- =============================================================================
-- Migration: 0086_feature_classifications_rls.sql
-- Purpose:   Enable Row-Level Security on the FounderOS Commercialization Layer
--            `feature_classifications` table with a DENY-BY-DEFAULT posture,
--            then add tenant-isolation policies. Mirrors the tenancy model from
--            0002 and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the feature_classifications table (deny-by-default until
-- policies are added).
-- -----------------------------------------------------------------------------
alter table feature_classifications enable row level security;

-- =============================================================================
-- feature_classifications — mutable: features are classified, re-scored, flagged
-- as SaaS candidates, and eventually marked commercialized over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy feature_classifications_select on feature_classifications
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy feature_classifications_insert on feature_classifications
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy feature_classifications_update on feature_classifications
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy feature_classifications_delete on feature_classifications
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0087_idea_dispositions.sql >>>>>
-- =============================================================================
-- Migration: 0087_idea_dispositions.sql
-- Purpose:   Stand up the Alfy² Idea Disposition capture — a single
--            `idea_dispositions` table that records the Founder Operating
--            Principle: convert speed of thought into speed of execution.
--
-- FOUNDER OPERATING PRINCIPLE
--   - The goal is to convert SPEED OF THOUGHT into SPEED OF EXECUTION.
--   - Every idea is immediately given a disposition — it becomes exactly one of:
--       task         — do it now / schedule it as work.
--       asset        — capture it as a reusable asset.
--       campaign     — turn it into a marketing/outreach campaign.
--       offer        — shape it into a productized offer.
--       agent        — build an agent to run it.
--       workflow     — encode it as a repeatable workflow.
--       parked_idea  — explicitly parked for later (not lost).
--       killed_idea  — explicitly killed (decided against, on the record).
--   - `reason` records WHY the idea was dispositioned the way it was, and
--     `business_id` optionally ties it to one of the operator's businesses.
--   - The point: no idea ever dies silently in notes — every one is captured
--     and routed.
--
-- IMMUTABLE CAPTURE RECORDS
--   - A disposition is a recorded moment of decision. There is intentionally NO
--     updated_at column and NO update trigger: capture rows are not edited in
--     place. They can be discarded (DELETE) but never rewritten.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables (omitted here — immutable capture rows).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0088_idea_dispositions_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- idea_dispositions — one captured idea routed to exactly one disposition
-- (task/asset/campaign/offer/agent/workflow/parked/killed), with the reason for
-- the call and an optional business link. Immutable capture record: no
-- updated_at, no update trigger.
-- -----------------------------------------------------------------------------
create table if not exists idea_dispositions (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  idea          text        not null,
  disposition   text        not null
                            check (disposition in (
                              'task','asset','campaign','offer','agent',
                              'workflow','parked_idea','killed_idea')),
  reason        text        not null,
  business_id   uuid,
  created_at    timestamptz not null default now()
);

create index if not exists idea_dispositions_tenant_disposition_idx
  on idea_dispositions (tenant_id, disposition);

-- >>>>> 0088_idea_dispositions_rls.sql >>>>>
-- =============================================================================
-- Migration: 0088_idea_dispositions_rls.sql
-- Purpose:   Enable Row-Level Security on the Idea Disposition capture
--            `idea_dispositions` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- IMMUTABLE CAPTURE RECORDS
--   `idea_dispositions` rows are recorded moments of decision. They get
--   SELECT + INSERT + DELETE policies ONLY. The deliberate ABSENCE of an UPDATE
--   policy, combined with deny-by-default, makes every existing disposition
--   immutable — a capture row can be discarded but never rewritten in place.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the idea_dispositions table (deny-by-default until policies are
-- added).
-- -----------------------------------------------------------------------------
alter table idea_dispositions enable row level security;

-- =============================================================================
-- idea_dispositions — capture records: read/append within the tenant, and
-- discard (DELETE) to remove a captured idea. No UPDATE policy on purpose:
-- deny-by-default then makes every existing disposition immutable.
-- select/insert/delete, all tenant-scoped.
-- =============================================================================
create policy idea_dispositions_select on idea_dispositions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy idea_dispositions_insert on idea_dispositions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy idea_dispositions_delete on idea_dispositions
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0089_hierarchy_nodes.sql >>>>>
-- =============================================================================
-- Migration: 0089_hierarchy_nodes.sql
-- Purpose:   Stand up the Alfy² Enterprise Hierarchy feature — a single
--            `hierarchy_nodes` table that models the operator's enterprise as a
--            tree. Implements Enterprise Hierarchy on top of the tenant-scoped
--            platform.
--
-- ENTERPRISE HIERARCHY MODEL
--   - Nodes form a tree spanning eight levels, top to bottom:
--       Enterprise → Companies → Departments → Teams → Projects → Assets →
--       Tasks → Agents.
--   - Each level INHERITS policies, security, branding, permissions, and assets
--     from the level above it, with company-level OVERRIDES carried on the node's
--     `own` settings.
--   - The tree powers portfolio reporting across companies, surfaces
--     cross-company opportunities, and supports shared vendors / SOPs /
--     compliance reused down the hierarchy.
--   - `parent_id` points at the parent node (null at the enterprise root); `own`
--     holds the node's own overrides layered on top of inherited settings.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0090_hierarchy_nodes_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- hierarchy_nodes — one node in the operator's enterprise tree. Carries its
-- level (enterprise → company → department → team → project → asset → task →
-- agent), its parent, and its own override settings layered on top of the
-- policies/security/branding/permissions/assets inherited from above. Powers
-- portfolio reporting, cross-company opportunities, and shared vendors/SOPs/
-- compliance. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists hierarchy_nodes (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  level       text        not null
                          check (level in (
                            'enterprise','company','department','team',
                            'project','asset','task','agent')),
  name        text        not null,
  parent_id   uuid,
  own         jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists hierarchy_nodes_tenant_level_idx
  on hierarchy_nodes (tenant_id, level);

create index if not exists hierarchy_nodes_tenant_parent_idx
  on hierarchy_nodes (tenant_id, parent_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger for hierarchy_nodes. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_hierarchy_nodes on hierarchy_nodes;
create trigger set_updated_at_hierarchy_nodes
  before update on hierarchy_nodes
  for each row execute function set_updated_at();

-- >>>>> 0090_hierarchy_nodes_rls.sql >>>>>
-- =============================================================================
-- Migration: 0090_hierarchy_nodes_rls.sql
-- Purpose:   Enable Row-Level Security on the Enterprise Hierarchy
--            `hierarchy_nodes` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on hierarchy_nodes (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table hierarchy_nodes enable row level security;

-- =============================================================================
-- hierarchy_nodes — mutable: the enterprise tree is built up and restructured
-- over time (nodes added, renamed, re-parented, removed). select/insert/update/
-- delete, all tenant-scoped.
-- =============================================================================
create policy hierarchy_nodes_select on hierarchy_nodes
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy hierarchy_nodes_insert on hierarchy_nodes
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy hierarchy_nodes_update on hierarchy_nodes
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy hierarchy_nodes_delete on hierarchy_nodes
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0091_reflections.sql >>>>>
-- =============================================================================
-- Migration: 0091_reflections.sql
-- Purpose:   Stand up the Alfy² Reflection Engine — a single `reflections`
--            table that stores periodic operational reviews. Implements the
--            Reflection Engine on top of the tenant-scoped platform.
--
-- REFLECTION ENGINE MODEL
--   - Each row is a weekly / monthly / quarterly / yearly operational review:
--     the engine looks back over the period and writes out what it learned and
--     what should change.
--   - The review captures lessons learned, recommended improvements, workflows
--     to automate, workflows to retire, new agents to build, risks to address,
--     and the priorities for the next period, plus a narrative `summary`.
--   - Reflections are the INSTITUTIONAL MEMORY of Alfy²: they are APPEND-ONLY.
--     A row is a recorded review, not edited in place. There is no updated_at
--     and no trigger — each period appends a new reflection rather than mutating
--     an old one.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0092_reflections_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- reflections — a periodic operational review for one period (weekly, monthly,
-- quarterly, yearly). Captures lessons learned, recommended improvements,
-- workflows to automate/retire, new agents to build, risks to address, and the
-- next period's priorities, plus a narrative summary. The institutional memory
-- of Alfy². Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists reflections (
  id                        uuid        primary key default gen_random_uuid(),
  tenant_id                 uuid        not null,
  period                    text        not null
                                        check (period in (
                                          'weekly','monthly','quarterly','yearly')),
  period_label              text        not null default '',
  lessons_learned           jsonb       not null default '[]'::jsonb,
  recommended_improvements  jsonb       not null default '[]'::jsonb,
  workflows_to_automate     jsonb       not null default '[]'::jsonb,
  workflows_to_retire       jsonb       not null default '[]'::jsonb,
  new_agents_to_build       jsonb       not null default '[]'::jsonb,
  risks_to_address          jsonb       not null default '[]'::jsonb,
  next_period_priorities    jsonb       not null default '[]'::jsonb,
  summary                   text        not null,
  created_at                timestamptz not null default now()
);

create index if not exists reflections_tenant_period_idx
  on reflections (tenant_id, period);

-- >>>>> 0092_reflections_rls.sql >>>>>
-- =============================================================================
-- Migration: 0092_reflections_rls.sql
-- Purpose:   Enable Row-Level Security on the Reflection Engine `reflections`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and the append-only
--            posture from 0059.
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
-- APPEND-ONLY
--   `reflections` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE of
--   UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing reflection immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `revenue_intel` in 0059 and of `events`
--   + `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on reflections (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table reflections enable row level security;

-- =============================================================================
-- reflections — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing reflection immutable, matching revenue_intel in 0059.
-- =============================================================================
create policy reflections_select on reflections
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy reflections_insert on reflections
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0093_graph_nodes.sql >>>>>
-- =============================================================================
-- Migration: 0093_graph_nodes.sql
-- Purpose:   Stand up the Alfy² Enterprise Knowledge Graph — two tables,
--            `graph_nodes` and `graph_edges`, that together store the operator's
--            knowledge graph. Implements the Knowledge Graph on top of the
--            tenant-scoped platform.
--
-- ENTERPRISE KNOWLEDGE GRAPH MODEL
--   - `graph_nodes` are the entities in the graph: one of 15 node kinds (person,
--     business, project, task, document, asset, meeting, github_repo,
--     automation, goal, workflow, agent, vendor, investor, competitor). Each
--     node carries a name, a free-form `ref_id` linking it back to its source
--     record, and `tags`.
--   - `graph_edges` are the TYPED RELATIONSHIPS between nodes: a directed edge
--     from one node to another, labelled by `relationship` and carrying a
--     `weight` in [0,1] for graph-based recommendations.
--   - The graph is searchable, visualizable, and supports graph-based
--     recommendations across the operator's surface.
--   - Both tables are CAPTURE RECORDS: nodes and edges are recorded facts, not
--     edited in place. Neither has an updated_at and neither gets a trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; these are capture records, so they have
--     none and get no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0094_graph_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- graph_nodes — an entity in the knowledge graph, one of 15 kinds, with a name,
-- a free-form ref_id back to its source record, and tags. A capture record (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists graph_nodes (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  kind        text        not null
                          check (kind in (
                            'person','business','project','task','document',
                            'asset','meeting','github_repo','automation','goal',
                            'workflow','agent','vendor','investor','competitor')),
  name        text        not null,
  ref_id      text        not null default '',
  tags        jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists graph_nodes_tenant_kind_idx
  on graph_nodes (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- graph_edges — a typed, directed, weighted relationship between two graph
-- nodes. `from_id`/`to_id` reference the endpoints, `relationship` labels the
-- edge, and `weight` in [0,1] drives graph-based recommendations. A capture
-- record (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists graph_edges (
  id            uuid              primary key default gen_random_uuid(),
  tenant_id     uuid              not null,
  from_id       uuid              not null,
  to_id         uuid              not null,
  relationship  text              not null,
  weight        double precision  not null default 0.5
                                  check (weight >= 0 and weight <= 1),
  created_at    timestamptz       not null default now()
);

create index if not exists graph_edges_tenant_from_idx
  on graph_edges (tenant_id, from_id);

create index if not exists graph_edges_tenant_to_idx
  on graph_edges (tenant_id, to_id);

-- >>>>> 0094_graph_rls.sql >>>>>
-- =============================================================================
-- Migration: 0094_graph_rls.sql
-- Purpose:   Enable Row-Level Security on the Enterprise Knowledge Graph tables
--            `graph_nodes` and `graph_edges` with a DENY-BY-DEFAULT posture,
--            then add tenant-isolation policies. Mirrors the tenancy model from
--            0002.
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
-- CAPTURE RECORDS
--   `graph_nodes` and `graph_edges` get SELECT + INSERT + DELETE policies — they
--   are captured and can be pruned, but NOT edited in place. The deliberate
--   ABSENCE of an UPDATE policy, combined with deny-by-default, means no caller
--   can mutate an existing node or edge.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on both graph tables (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table graph_nodes enable row level security;
alter table graph_edges enable row level security;

-- =============================================================================
-- graph_nodes — CAPTURE RECORDS. select/insert/delete, all tenant-scoped.
-- No UPDATE policy on purpose: nodes are captured, pruned, or re-captured, not
-- edited in place.
-- =============================================================================
create policy graph_nodes_select on graph_nodes
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy graph_nodes_insert on graph_nodes
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy graph_nodes_delete on graph_nodes
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- graph_edges — CAPTURE RECORDS. select/insert/delete, all tenant-scoped.
-- No UPDATE policy on purpose: edges are captured, pruned, or re-captured, not
-- edited in place.
-- =============================================================================
create policy graph_edges_select on graph_edges
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy graph_edges_insert on graph_edges
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy graph_edges_delete on graph_edges
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0095_operating_manuals.sql >>>>>
-- =============================================================================
-- Migration: 0095_operating_manuals.sql
-- Purpose:   Stand up the Alfy² Operating Manual Generator — a single
--            `operating_manuals` table that captures the reusable IP a workflow
--            produces once it stabilizes. Implements Operating Manuals on top of
--            the tenant-scoped platform.
--
-- OPERATING MANUAL MODEL
--   - When a workflow STABILIZES, the engine generates its operating manual and
--     stores it in the Asset Library: the SOP, checklist, playbook, onboarding
--     guide, training material, troubleshooting guide, KPIs, and ownership
--     matrix. These generated documents live in `artifacts`.
--   - Every successful workflow is REUSABLE IP — `reusable_ip` is true by
--     default, marking the manual as an asset the operator can redeploy.
--   - A manual is tied to its source `workflow_name` and (optionally) the
--     `business_id` it was generated for.
--   - Manuals are regenerated as workflows evolve, so the table is Mutable and
--     carries updated_at maintained by the shared trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0096_operating_manuals_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- operating_manuals — the generated operating manual for a stabilized workflow.
-- Holds the SOP/checklist/playbook/onboarding/training/troubleshooting/KPIs/
-- ownership-matrix artifacts in `artifacts`, stored in the Asset Library. Every
-- successful workflow is reusable IP (`reusable_ip` true by default). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists operating_manuals (
  id             uuid        primary key default gen_random_uuid(),
  tenant_id      uuid        not null,
  workflow_name  text        not null,
  business_id    uuid,
  artifacts      jsonb       not null default '[]'::jsonb,
  reusable_ip    boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists operating_manuals_tenant_workflow_idx
  on operating_manuals (tenant_id, workflow_name);

-- -----------------------------------------------------------------------------
-- updated_at trigger for operating_manuals. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_operating_manuals on operating_manuals;
create trigger set_updated_at_operating_manuals
  before update on operating_manuals
  for each row execute function set_updated_at();

-- >>>>> 0096_operating_manuals_rls.sql >>>>>
-- =============================================================================
-- Migration: 0096_operating_manuals_rls.sql
-- Purpose:   Enable Row-Level Security on the Operating Manual Generator
--            `operating_manuals` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on operating_manuals (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table operating_manuals enable row level security;

-- =============================================================================
-- operating_manuals — mutable: manuals are generated and regenerated as
-- workflows evolve. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy operating_manuals_select on operating_manuals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy operating_manuals_insert on operating_manuals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy operating_manuals_update on operating_manuals
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy operating_manuals_delete on operating_manuals
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0097_twin_snapshots.sql >>>>>
-- =============================================================================
-- Migration: 0097_twin_snapshots.sql
-- Purpose:   Stand up the Alfy² Digital Twin — a single `twin_snapshots` table
--            that stores continuously-updated, point-in-time models of the
--            enterprise. Implements the Digital Twin on top of the tenant-scoped
--            platform.
--
-- DIGITAL TWIN MODEL
--   - The Digital Twin is a continuously-updated model of the entire enterprise:
--     businesses, finances, assets, contacts, projects, agents, workflows,
--     campaigns, goals, and risks. The full modeled state is captured in
--     `state`.
--   - The twin supports WHAT-IF SIMULATIONS — the operator forecasts off the
--     modeled state, and `runway_months` carries the headline forecast metric
--     (nullable until computed).
--   - Each row is a COMPUTED POINT-IN-TIME SNAPSHOT (`captured_at`). Snapshots
--     are APPEND-ONLY: successive captures append new snapshots rather than
--     mutating old ones, giving a history to forecast against. There is no
--     updated_at and no trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0098_twin_snapshots_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- twin_snapshots — a continuously-updated, point-in-time model of the enterprise
-- (businesses/finances/assets/contacts/projects/agents/workflows/campaigns/
-- goals/risks) captured in `state`, supporting what-if simulations and runway
-- forecasting. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists twin_snapshots (
  id             uuid              primary key default gen_random_uuid(),
  tenant_id      uuid              not null,
  state          jsonb             not null default '{}'::jsonb,
  runway_months  double precision,
  captured_at    timestamptz       not null default now()
);

create index if not exists twin_snapshots_tenant_captured_idx
  on twin_snapshots (tenant_id, captured_at);

-- >>>>> 0098_twin_snapshots_rls.sql >>>>>
-- =============================================================================
-- Migration: 0098_twin_snapshots_rls.sql
-- Purpose:   Enable Row-Level Security on the Digital Twin `twin_snapshots`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
-- APPEND-ONLY
--   `twin_snapshots` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing snapshot immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on twin_snapshots (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table twin_snapshots enable row level security;

-- =============================================================================
-- twin_snapshots — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing snapshot immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy twin_snapshots_select on twin_snapshots
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy twin_snapshots_insert on twin_snapshots
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0099_institutional_records.sql >>>>>
-- =============================================================================
-- Migration: 0099_institutional_records.sql
-- Purpose:   Stand up the Alfy² Institutional Memory — a single
--            `institutional_records` table that captures the enterprise's
--            durable decision record. Implements Institutional Memory on top of
--            the tenant-scoped platform.
--
-- INSTITUTIONAL MEMORY MODEL
--   - The table captures the institution's hard-won knowledge across nine
--     `kind`s: decision rationale, rejected ideas, failed and successful
--     experiments, negotiation outcomes, lessons learned, vendor experiences,
--     client preferences, and implementation history.
--   - Every decision answers two questions directly: WHAT DID WE KNOW at the
--     time (`what_we_knew`) and WHY DID WE CHOOSE THIS (`why_chosen`), with the
--     `alternatives_rejected` we passed over recorded alongside.
--   - A record carries a `title`, free-form `detail`, optional `business_id`,
--     and `tags` for retrieval.
--   - Records are APPEND-ONLY: a record is a recorded fact, not edited in place.
--     There is no updated_at and no trigger — new knowledge appends new records
--     rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0100_institutional_records_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- institutional_records — a durable record of institutional knowledge: decision
-- rationale, rejected ideas, failed/successful experiments, negotiation
-- outcomes, lessons learned, vendor experiences, client preferences, and
-- implementation history. Every record answers what we knew and why we chose
-- this, with the alternatives we rejected. Append-only (no updated_at, no
-- trigger).
-- -----------------------------------------------------------------------------
create table if not exists institutional_records (
  id                     uuid        primary key default gen_random_uuid(),
  tenant_id              uuid        not null,
  kind                   text        not null
                                     check (kind in (
                                       'decision_rationale','rejected_idea',
                                       'failed_experiment','successful_experiment',
                                       'negotiation_outcome','lesson_learned',
                                       'vendor_experience','client_preference',
                                       'implementation_history')),
  title                  text        not null,
  detail                 text        not null default '',
  what_we_knew           text        not null default '',
  why_chosen             text        not null default '',
  alternatives_rejected  jsonb       not null default '[]'::jsonb,
  business_id            uuid,
  tags                   jsonb       not null default '[]'::jsonb,
  created_at             timestamptz not null default now()
);

create index if not exists institutional_records_tenant_kind_idx
  on institutional_records (tenant_id, kind);

-- >>>>> 0100_institutional_records_rls.sql >>>>>
-- =============================================================================
-- Migration: 0100_institutional_records_rls.sql
-- Purpose:   Enable Row-Level Security on the Institutional Memory
--            `institutional_records` table with a DENY-BY-DEFAULT posture, then
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
-- APPEND-ONLY
--   `institutional_records` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing record immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on institutional_records (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table institutional_records enable row level security;

-- =============================================================================
-- institutional_records — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing record immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy institutional_records_select on institutional_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy institutional_records_insert on institutional_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0101_workflow_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0101_workflow_evaluations.sql
-- Purpose:   Stand up the Alfy² Continuous Improvement Engine — a single
--            `workflow_evaluations` table that records the engine's standing
--            verdict on every workflow the operator runs.
--
-- CONTINUOUS IMPROVEMENT ENGINE
--   - The engine evaluates EVERY workflow against a fixed dimension set:
--       speed, quality, cost, conversion, reliability, user-effort.
--     Per-dimension scores and supporting evidence live on `metrics`.
--   - Each evaluation rolls up to a single normalized `health_score` in [0,1]
--     (0 = failing, 1 = optimal), so workflows can be ranked and triaged.
--   - The engine emits actionable `recommendations` — each proposing one of:
--       simplify, automate, remove, merge, split, delegate
--     together with its expected impact and a confidence score — so the operator
--     sees not just WHAT is wrong but WHICH change to make and how sure we are.
--   - One standing evaluation per workflow: `(tenant_id, workflow_name)` is
--     unique, and each re-evaluation upserts the row in place. Mutable.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0102_workflow_evaluations_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- workflow_evaluations — the Continuous Improvement Engine's standing verdict on
-- one workflow. `metrics` carries per-dimension scores (speed, quality, cost,
-- conversion, reliability, user-effort); `health_score` is the normalized [0,1]
-- roll-up; `recommendations` holds the proposed changes (simplify/automate/
-- remove/merge/split/delegate) with expected impact + confidence. One standing
-- row per workflow, upserted on each re-evaluation. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists workflow_evaluations (
  id               uuid              primary key default gen_random_uuid(),
  tenant_id        uuid              not null,
  workflow_name    text              not null,
  metrics          jsonb             not null default '{}'::jsonb,
  health_score     double precision  not null default 0
                                     check (health_score >= 0 and health_score <= 1),
  recommendations  jsonb             not null default '[]'::jsonb,
  created_at       timestamptz       not null default now(),
  updated_at       timestamptz,
  unique (tenant_id, workflow_name)
);

-- -----------------------------------------------------------------------------
-- updated_at trigger for workflow_evaluations. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_workflow_evaluations on workflow_evaluations;
create trigger set_updated_at_workflow_evaluations
  before update on workflow_evaluations
  for each row execute function set_updated_at();

-- >>>>> 0102_workflow_evaluations_rls.sql >>>>>
-- =============================================================================
-- Migration: 0102_workflow_evaluations_rls.sql
-- Purpose:   Enable Row-Level Security on the Continuous Improvement Engine
--            `workflow_evaluations` table with a DENY-BY-DEFAULT posture, then
--            add tenant-isolation policies. Mirrors the tenancy model from 0002
--            and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the workflow_evaluations table (deny-by-default until policies
-- are added).
-- -----------------------------------------------------------------------------
alter table workflow_evaluations enable row level security;

-- =============================================================================
-- workflow_evaluations — mutable: evaluations are created and upserted in place
-- as the engine re-scores each workflow over time. select/insert/update/delete,
-- all tenant-scoped.
-- =============================================================================
create policy workflow_evaluations_select on workflow_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_evaluations_insert on workflow_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_evaluations_update on workflow_evaluations
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy workflow_evaluations_delete on workflow_evaluations
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0103_venture_blueprints.sql >>>>>
-- =============================================================================
-- Migration: 0103_venture_blueprints.sql
-- Purpose:   Stand up the Alfy² Builder Mode feature — a single
--            `venture_blueprints` table that captures the operating system the
--            engine designs for a brand-new venture.
--
-- BUILDER MODE
--   - An operator saying "I want to build…" launches Builder Mode, which spins
--     up an 18-stage venture OPERATING SYSTEM — from discovery through staged
--     review checkpoints — not merely a flat task list. The full stage graph
--     (each stage's plan, outputs, and review gate) lives on `stages`.
--   - HUMAN-IN-COMMAND: a blueprint stays `awaiting_approval` and never advances
--     on its own; it flips to `approved` only on an explicit operator decision.
--     The two-state lifecycle is enforced here:
--       awaiting_approval → approved.
--   - The output is the complete OS for the new venture — `idea` is the seed,
--     `business_name` is filled in as discovery resolves it, and `stages`
--     accumulates the produced operating system. Mutable.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0104_venture_blueprints_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- venture_blueprints — the operating system Builder Mode designs for a new
-- venture from an operator's "I want to build…" prompt. `idea` is the seed,
-- `business_name` resolves during discovery, and `stages` holds the 18-stage
-- venture OS (discovery → review checkpoints) — the complete operating system,
-- not just a task list. Human-in-command: `status` stays awaiting_approval until
-- an explicit operator decision flips it to approved. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists venture_blueprints (
  id             uuid          primary key default gen_random_uuid(),
  tenant_id      uuid          not null,
  idea           text          not null,
  business_name  text          not null default '',
  stages         jsonb         not null default '[]'::jsonb,
  status         text          not null default 'awaiting_approval'
                               check (status in ('awaiting_approval','approved')),
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz
);

create index if not exists venture_blueprints_tenant_status_idx
  on venture_blueprints (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for venture_blueprints. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_venture_blueprints on venture_blueprints;
create trigger set_updated_at_venture_blueprints
  before update on venture_blueprints
  for each row execute function set_updated_at();

-- >>>>> 0104_venture_blueprints_rls.sql >>>>>
-- =============================================================================
-- Migration: 0104_venture_blueprints_rls.sql
-- Purpose:   Enable Row-Level Security on the Builder Mode `venture_blueprints`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the venture_blueprints table (deny-by-default until policies are
-- added).
-- -----------------------------------------------------------------------------
alter table venture_blueprints enable row level security;

-- =============================================================================
-- venture_blueprints — mutable: blueprints are created, enriched through
-- discovery, and (on an explicit operator decision) approved over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy venture_blueprints_select on venture_blueprints
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy venture_blueprints_insert on venture_blueprints
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy venture_blueprints_update on venture_blueprints
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy venture_blueprints_delete on venture_blueprints
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0105_finance_overviews.sql >>>>>
-- =============================================================================
-- Migration: 0105_finance_overviews.sql
-- Purpose:   Stand up the Alfy² Finance Command Center — a single
--            `finance_overviews` table that stores computed, point-in-time
--            snapshots of personal and business finances: total revenue,
--            expenses, net cash flow, tax exposure, per-business breakdowns,
--            personal net worth, and the headline. Implements Finance Command
--            on top of the tenant-scoped platform.
--
-- FINANCE COMMAND MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SNAPSHOT of the operator's complete
--     finance surface: the engine analyzes income, expenses, cash flow, taxes,
--     and per-business finances and writes the conclusions out as a dated
--     snapshot (`generated_at`).
--   - `businesses` holds the per-business finance reports (revenue, expenses,
--     profit, margin, tax exposure, runway, best next action, risks,
--     opportunities) the engine produced for this snapshot.
--   - Alfy² analyzes aggressively but NEVER moves or spends money without
--     approval: `money_actions_require_approval` is always true.
--   - Snapshots are IMMUTABLE: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new snapshots rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0106_finance_overviews_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- finance_overviews — a computed point-in-time snapshot of the operator's
-- complete finance picture: total monthly revenue/expenses, net cash flow,
-- total tax exposure, per-business reports, personal net worth and monthly net,
-- and the headline. Money actions always require approval. Immutable (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists finance_overviews (
  id                          uuid              primary key default gen_random_uuid(),
  tenant_id                   uuid              not null,
  total_monthly_revenue_usd   double precision  not null default 0,
  total_monthly_expenses_usd  double precision  not null default 0,
  net_cash_flow_usd           double precision  not null default 0,
  total_tax_exposure_usd      double precision  not null default 0,
  businesses                  jsonb             not null default '[]'::jsonb,
  personal_net_worth_usd      double precision  not null default 0,
  personal_monthly_net_usd    double precision  not null default 0,
  headline                    text              not null,
  money_actions_require_approval  boolean       not null default true,
  generated_at                timestamptz       not null default now(),
  created_at                  timestamptz       not null default now()
);

create index if not exists finance_overviews_tenant_generated_idx
  on finance_overviews (tenant_id, generated_at);

-- >>>>> 0106_finance_overviews_rls.sql >>>>>
-- =============================================================================
-- Migration: 0106_finance_overviews_rls.sql
-- Purpose:   Enable Row-Level Security on the Finance Command
--            `finance_overviews` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- POINT-IN-TIME / IMMUTABLE
--   `finance_overviews` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing snapshot immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on finance_overviews (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table finance_overviews enable row level security;

-- =============================================================================
-- finance_overviews — POINT-IN-TIME / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing snapshot immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy finance_overviews_select on finance_overviews
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy finance_overviews_insert on finance_overviews
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0107_tax_analyses.sql >>>>>
-- =============================================================================
-- Migration: 0107_tax_analyses.sql
-- Purpose:   Stand up the Alfy² Legal Tax Strategy Analyzer — a single
--            `tax_analyses` table that stores computed analyses of LEGAL tax
--            optimization opportunities (avoidance, deferral, deduction,
--            structuring, planning — never evasion) for CPA/attorney review.
--            Implements the Tax Strategy Analyzer on top of the tenant-scoped
--            platform.
--
-- TAX STRATEGY MODEL
--   - Each row is a COMPUTED ANALYSIS for one subject: the engine analyzes the
--     financial picture and writes out the conclusions as a dated record
--     (`created_at`).
--   - `recommendations` holds the per-area tax recommendations the engine
--     produced (area, title, why it may apply, estimated benefit, risk,
--     complexity, documents needed, next step, advisor questions). Each
--     recommendation requires professional review.
--   - `disclaimer` carries the standing disclaimer — analysis, not advice;
--     legal optimization only. Alfy² prepares analysis, scenarios, questions,
--     and recommendations for CPA/attorney review; it does NOT provide final
--     legal or tax advice.
--   - Analyses are IMMUTABLE: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive analyses append
--     new rows rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0108_tax_analyses_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tax_analyses — a computed legal-tax-strategy analysis for one subject. Holds
-- the per-area recommendations (analysis only, for professional review) and the
-- standing disclaimer. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists tax_analyses (
  id               uuid              primary key default gen_random_uuid(),
  tenant_id        uuid              not null,
  subject          text              not null,
  recommendations  jsonb             not null default '[]'::jsonb,
  disclaimer       text              not null,
  created_at       timestamptz       not null default now()
);

create index if not exists tax_analyses_tenant_created_idx
  on tax_analyses (tenant_id, created_at);

-- >>>>> 0108_tax_analyses_rls.sql >>>>>
-- =============================================================================
-- Migration: 0108_tax_analyses_rls.sql
-- Purpose:   Enable Row-Level Security on the Tax Strategy `tax_analyses` table
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002.
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
--   `tax_analyses` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE of
--   UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing analysis immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on tax_analyses (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table tax_analyses enable row level security;

-- =============================================================================
-- tax_analyses — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing analysis immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy tax_analyses_select on tax_analyses
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy tax_analyses_insert on tax_analyses
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0109_entity_analyses.sql >>>>>
-- =============================================================================
-- Migration: 0109_entity_analyses.sql
-- Purpose:   Stand up the Alfy² Entity Structure Optimizer — a single
--            `entity_analyses` table that stores computed analyses of whether
--            each business should remain an LLC, elect S Corp treatment, convert
--            to C Corp, create subsidiaries, or sit under a holding company.
--            Analysis only, for CPA/attorney review. Implements the Entity
--            Structure Optimizer on top of the tenant-scoped platform.
--
-- ENTITY STRUCTURE MODEL
--   - Six entity structures span the optimizer's surface:
--       sole_prop, llc, llc_s_corp, c_corp, holding_company,
--       subsidiary_under_holding.
--   - Each row is a COMPUTED ANALYSIS for one business: the engine evaluates the
--     business from revenue, profit, payroll, investor plans, exit potential,
--     liability, owners, IP, and future SaaS, and writes out the conclusions as
--     a dated record (`created_at`).
--   - `current_structure` and `recommended_structure` capture the move; the
--     engine explains it in `why_recommended`.
--   - `alternatives` holds the candidate structures with their trade-offs;
--     `cpa_questions`, `attorney_questions`, and `action_checklist` prep the
--     operator for professional review. `risk_level` rates the recommendation,
--     and `requires_professional_review` is always true.
--   - Analyses are IMMUTABLE: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive analyses append
--     new rows rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0110_entity_analyses_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- entity_analyses — a computed entity-structure analysis for one business.
-- Captures the current and recommended structure, why it is recommended, the
-- candidate alternatives with trade-offs, CPA/attorney questions, an action
-- checklist, and the risk level. Always requires professional review.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists entity_analyses (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  business_name          text              not null,
  current_structure      text              not null
                                           check (current_structure in (
                                             'sole_prop','llc','llc_s_corp','c_corp',
                                             'holding_company','subsidiary_under_holding')),
  recommended_structure  text              not null
                                           check (recommended_structure in (
                                             'sole_prop','llc','llc_s_corp','c_corp',
                                             'holding_company','subsidiary_under_holding')),
  why_recommended        text              not null,
  alternatives           jsonb             not null default '[]'::jsonb,
  cpa_questions          jsonb             not null default '[]'::jsonb,
  attorney_questions     jsonb             not null default '[]'::jsonb,
  action_checklist       jsonb             not null default '[]'::jsonb,
  risk_level             text              not null check (risk_level in ('low','medium','high')),
  requires_professional_review  boolean    not null default true,
  created_at             timestamptz       not null default now()
);

create index if not exists entity_analyses_tenant_business_idx
  on entity_analyses (tenant_id, business_name);

-- >>>>> 0110_entity_analyses_rls.sql >>>>>
-- =============================================================================
-- Migration: 0110_entity_analyses_rls.sql
-- Purpose:   Enable Row-Level Security on the Entity Structure `entity_analyses`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
--   `entity_analyses` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing analysis immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on entity_analyses (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table entity_analyses enable row level security;

-- =============================================================================
-- entity_analyses — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing analysis immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy entity_analyses_select on entity_analyses
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy entity_analyses_insert on entity_analyses
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0111_wealth_items.sql >>>>>
-- =============================================================================
-- Migration: 0111_wealth_items.sql
-- Purpose:   Stand up the Alfy² Wealth Architecture Dump Box — a single
--            `wealth_items` table that stores processed wealth items: the
--            10-step pipeline output for each idea Alyssa drops (investment,
--            tax, trust, IRA, offshore, real-estate, savings goal, wealth
--            desire, screenshot, video, book note, advisor note, financial
--            product, business income plan). Implements the Wealth Dump Box on
--            top of the tenant-scoped platform.
--
-- WEALTH DUMP BOX MODEL
--   - Fourteen item kinds span the dump box surface (see the `kind` check).
--   - Each row is a PROCESSED item: the pipeline classifies, summarizes, scopes
--     (personal vs business), checks legality/compliance, scores upside and
--     risk, links to goals, attaches advisor questions, saves the payload to the
--     Wealth Knowledge Vault, and assigns a next action.
--   - `upside` and `risk` are scored on a 0..1 scale. `vault_asset_id` is the
--     Wealth Knowledge Vault reference (never the payload itself).
--   - `scope` classifies the item as personal, business, both, or unclear, and
--     `business_id` optionally ties it to a business.
--   - Items are MUTABLE: classification, scoring, scope, and next action are
--     refined over time, so the table carries updated_at maintained by the
--     shared trigger function set_updated_at() defined in 0001 (reused here,
--     not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0112_wealth_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- wealth_items — a processed wealth item: the 10-step pipeline output. Carries
-- the kind, title, summary, scope, legality notes, 0..1 upside/risk scores,
-- linked goals, advisor questions, the Wealth Knowledge Vault reference, and the
-- next action. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists wealth_items (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  kind               text              not null
                                       check (kind in (
                                         'investment_idea','tax_idea','trust_idea','ira_idea',
                                         'offshore_idea','real_estate_idea','savings_goal',
                                         'wealth_desire','screenshot','video','book_note',
                                         'advisor_note','financial_product','business_income_plan')),
  title              text              not null,
  summary            text              not null default '',
  scope              text              not null
                                       check (scope in ('personal','business','both','unclear')),
  legality_notes     text              not null default '',
  upside             double precision  not null default 0.5 check (upside >= 0 and upside <= 1),
  risk               double precision  not null default 0.5 check (risk >= 0 and risk <= 1),
  linked_goals       jsonb             not null default '[]'::jsonb,
  advisor_questions  jsonb             not null default '[]'::jsonb,
  vault_asset_id     text              not null,
  next_action        text              not null,
  requires_professional_review  boolean  not null default true,
  business_id        uuid,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz
);

create index if not exists wealth_items_tenant_kind_idx
  on wealth_items (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- updated_at trigger for wealth_items. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_wealth_items on wealth_items;
create trigger set_updated_at_wealth_items
  before update on wealth_items
  for each row execute function set_updated_at();

-- >>>>> 0112_wealth_items_rls.sql >>>>>
-- =============================================================================
-- Migration: 0112_wealth_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Wealth Dump Box `wealth_items`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the wealth_items table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table wealth_items enable row level security;

-- =============================================================================
-- wealth_items — mutable: items are classified, scored, scoped, and their next
-- action refined over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy wealth_items_select on wealth_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy wealth_items_insert on wealth_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy wealth_items_update on wealth_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy wealth_items_delete on wealth_items
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0113_money_game_plans.sql >>>>>
-- =============================================================================
-- Migration: 0113_money_game_plans.sql
-- Purpose:   Stand up the Alfy² Elite Money Game Engine — a single
--            `money_game_plans` table that stores computed, ranked plans for
--            legally minimizing taxes, protecting assets, building wealth, and
--            investing intelligently. Education and analysis only, for advisor
--            execution. Implements the Elite Money Game on top of the
--            tenant-scoped platform.
--
-- ELITE MONEY GAME MODEL
--   - Each row is a COMPUTED, RANKED PLAN for one subject: the engine assembles
--     the relevant strategies and writes the conclusions out as a dated record
--     (`created_at`).
--   - `strategies` holds the ranked money-game strategies (what it is, when it
--     applies / does not apply, benefits, risks, compliance requirements,
--     advisor needed, complexity, implementation steps).
--   - Core principles are pinned on every plan: `protect_downside_first` and
--     `legal_avoidance_only` are always true (legal tax avoidance only, never
--     evasion; protect downside first).
--   - `risk_level` rates the plan and `disclaimer` carries the standing
--     disclaimer — analysis and education only; CPA/attorney review for
--     execution.
--   - Plans are IMMUTABLE: a row is a recorded computation, not edited in place.
--     There is no updated_at and no trigger — successive plans append new rows
--     rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0114_money_game_plans_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- money_game_plans — a computed, ranked money-game plan for one subject. Holds
-- the ranked strategies (education and analysis only), the pinned principles
-- (protect downside first, legal avoidance only), the risk level, and the
-- standing disclaimer. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists money_game_plans (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  subject                 text              not null,
  strategies              jsonb             not null default '[]'::jsonb,
  protect_downside_first  boolean           not null default true,
  legal_avoidance_only    boolean           not null default true,
  risk_level              text              not null check (risk_level in ('low','medium','high')),
  disclaimer              text              not null,
  created_at              timestamptz       not null default now()
);

create index if not exists money_game_plans_tenant_created_idx
  on money_game_plans (tenant_id, created_at);

-- >>>>> 0114_money_game_plans_rls.sql >>>>>
-- =============================================================================
-- Migration: 0114_money_game_plans_rls.sql
-- Purpose:   Enable Row-Level Security on the Elite Money Game
--            `money_game_plans` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
--   `money_game_plans` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing plan immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on money_game_plans (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table money_game_plans enable row level security;

-- =============================================================================
-- money_game_plans — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing plan immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy money_game_plans_select on money_game_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy money_game_plans_insert on money_game_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0115_intelligence_items.sql >>>>>
-- =============================================================================
-- Migration: 0115_intelligence_items.sql
-- Purpose:   Stand up the Alfy² Executive Intelligence Network (EIN) store — a
--            single `intelligence_items` table that holds actionable executive
--            intelligence (not summaries). Each article is scored across ten
--            dimensions, classified, and turned into an item that states why it
--            matters, which businesses and goals it affects, immediate actions,
--            future implications, confidence, sources, the related living
--            briefing, and follow-ups. Implements EIN on top of the tenant-scoped
--            platform.
--
-- INTELLIGENCE NETWORK MODEL
--   - Each row is a CAPTURED INTELLIGENCE ITEM produced from one article: the
--     engine writes its conclusions out once, at a point in time.
--   - `scores` carries the ten article scores (importance, urgency, opportunity,
--     risk, revenue_potential, innovation, implementation_difficulty,
--     compliance_risk, strategic_value, long_term_impact) plus the recommended
--     reading minutes; `classification` buckets the item into one of
--     ignore / interesting / monitor / research / immediate_action.
--   - `related_briefing_id` links the item to the living briefing for a
--     developing story (Alyssa never rereads the same story twice).
--   - Items are APPEND-ONLY: a row is a recorded assessment, not edited in place.
--     There is no updated_at and no trigger — successive captures append new
--     items rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0116_intelligence_items_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- intelligence_items — a captured executive intelligence item produced from one
-- scored, classified article. Holds the executive summary, deep dive, why it
-- matters, the businesses/goals affected, agents to notify, immediate actions,
-- future implications, the ten scores, classification, confidence, sources, the
-- related living briefing, and follow-up recommendations. Append-only (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists intelligence_items (
  id                         uuid              primary key default gen_random_uuid(),
  tenant_id                  uuid              not null,
  title                      text              not null,
  executive_summary          text              not null,
  deep_dive                  text              not null default '',
  why_it_matters             text              not null,
  businesses_affected        jsonb             not null default '[]'::jsonb,
  goals_affected             jsonb             not null default '[]'::jsonb,
  agents_to_notify           jsonb             not null default '[]'::jsonb,
  immediate_actions          jsonb             not null default '[]'::jsonb,
  future_implications        jsonb             not null default '[]'::jsonb,
  scores                     jsonb             not null,
  classification             text              not null
                                               check (classification in (
                                                 'ignore','interesting','monitor',
                                                 'research','immediate_action')),
  confidence                 double precision  not null
                                               check (confidence >= 0 and confidence <= 1),
  sources                    jsonb             not null default '[]'::jsonb,
  related_briefing_id        uuid,
  follow_up_recommendations  jsonb             not null default '[]'::jsonb,
  created_at                 timestamptz       not null default now()
);

create index if not exists intelligence_items_tenant_classification_idx
  on intelligence_items (tenant_id, classification);

-- >>>>> 0116_intelligence_items_rls.sql >>>>>
-- =============================================================================
-- Migration: 0116_intelligence_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Executive Intelligence Network
--            `intelligence_items` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
--   `intelligence_items` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing item immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on intelligence_items (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table intelligence_items enable row level security;

-- =============================================================================
-- intelligence_items — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing item immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy intelligence_items_select on intelligence_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy intelligence_items_insert on intelligence_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0117_living_briefings.sql >>>>>
-- =============================================================================
-- Migration: 0117_living_briefings.sql
-- Purpose:   Stand up the Alfy² Executive Intelligence Network living-briefing
--            store — a single `living_briefings` table where a developing story
--            becomes ONE evolving record with a timeline, so Alyssa never
--            rereads the same story twice. Implements the living-briefing half
--            of EIN on top of the tenant-scoped platform.
--
-- LIVING BRIEFING MODEL
--   - Each row is ONE evolving record for a developing story, keyed by
--     `story_key`. Intelligence items sharing a story key roll into the same
--     living briefing.
--   - `current_state` holds the latest synthesis; `timeline` accumulates the
--     story's entries (each an {at, headline, note}) as it develops.
--   - Living briefings are MUTABLE: as a story develops, `current_state`,
--     `timeline`, and `businesses_affected` are updated in place. updated_at is
--     maintained by the shared trigger function set_updated_at() defined in 0001
--     (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in
-- 0118_living_briefings_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- living_briefings — one evolving record for a developing story, keyed by
-- story_key. Holds the title, current state, the accumulating timeline, and the
-- businesses affected. Updated in place as the story develops. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists living_briefings (
  id                   uuid              primary key default gen_random_uuid(),
  tenant_id            uuid              not null,
  story_key            text              not null,
  title                text              not null,
  current_state        text              not null,
  timeline             jsonb             not null default '[]'::jsonb,
  businesses_affected  jsonb             not null default '[]'::jsonb,
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz,
  unique (tenant_id, story_key)
);

create index if not exists living_briefings_tenant_story_idx
  on living_briefings (tenant_id, story_key);

-- -----------------------------------------------------------------------------
-- updated_at trigger for living_briefings. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_living_briefings on living_briefings;
create trigger set_updated_at_living_briefings
  before update on living_briefings
  for each row execute function set_updated_at();

-- >>>>> 0118_living_briefings_rls.sql >>>>>
-- =============================================================================
-- Migration: 0118_living_briefings_rls.sql
-- Purpose:   Enable Row-Level Security on the Executive Intelligence Network
--            `living_briefings` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on living_briefings (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table living_briefings enable row level security;

-- =============================================================================
-- living_briefings — mutable: a developing story's record evolves in place over
-- time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy living_briefings_select on living_briefings
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy living_briefings_insert on living_briefings
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy living_briefings_update on living_briefings
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy living_briefings_delete on living_briefings
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0119_failure_cases.sql >>>>>
-- =============================================================================
-- Migration: 0119_failure_cases.sql
-- Purpose:   Stand up the Alfy² Failure Database — a single `failure_cases`
--            table that tracks major failures (fraud, lawsuits, AI failures,
--            security breaches, failed startups, scams, regulatory actions,
--            bankruptcies, ethical failures) as permanent institutional
--            knowledge. Implements the Failure Database on top of the
--            tenant-scoped platform.
--
-- FAILURE DATABASE MODEL
--   - Each row is a CAPTURED FAILURE CASE: what happened, the timeline, why it
--     failed, the root cause, the warning signs, the lessons learned, and the
--     generated `how_alfy2_avoids_it` guidance.
--   - `kind` buckets the case into one of nine failure types:
--       fraud, lawsuit, ai_failure, security_breach, failed_startup, scam,
--       regulatory_action, bankruptcy, ethical_failure.
--   - Failure cases are APPEND-ONLY: a row is permanent institutional knowledge,
--     not edited in place. There is no updated_at and no trigger — new lessons
--     append new cases rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0120_failure_cases_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- failure_cases — a captured failure recorded as permanent institutional
-- knowledge. Holds what happened, the timeline, why it failed, the root cause,
-- the warning signs, the lessons learned, and how Alfy² avoids repeating it.
-- One of nine kinds. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists failure_cases (
  id                   uuid              primary key default gen_random_uuid(),
  tenant_id            uuid              not null,
  kind                 text              not null
                                         check (kind in (
                                           'fraud','lawsuit','ai_failure','security_breach',
                                           'failed_startup','scam','regulatory_action',
                                           'bankruptcy','ethical_failure')),
  title                text              not null,
  what_happened        text              not null default '',
  timeline             jsonb             not null default '[]'::jsonb,
  why_it_failed        text              not null default '',
  root_cause           text              not null default '',
  warning_signs        jsonb             not null default '[]'::jsonb,
  lessons_learned      jsonb             not null default '[]'::jsonb,
  how_alfy2_avoids_it  jsonb             not null default '[]'::jsonb,
  created_at           timestamptz       not null default now()
);

create index if not exists failure_cases_tenant_kind_idx
  on failure_cases (tenant_id, kind);

-- >>>>> 0120_failure_cases_rls.sql >>>>>
-- =============================================================================
-- Migration: 0120_failure_cases_rls.sql
-- Purpose:   Enable Row-Level Security on the Failure Database `failure_cases`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
--   `failure_cases` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing case immutable — no caller can mutate or remove it. This matches
--   the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on failure_cases (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table failure_cases enable row level security;

-- =============================================================================
-- failure_cases — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing case immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy failure_cases_select on failure_cases
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy failure_cases_insert on failure_cases
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0121_trends.sql >>>>>
-- =============================================================================
-- Migration: 0121_trends.sql
-- Purpose:   Stand up the Alfy² Future Trends Lab — a single `trends` table that
--            tracks developments over 6mo / 1yr / 3yr / 5yr / 10yr horizons with
--            likelihood, impact, affected industries/businesses, preparation
--            steps, skills/tech needed, investment opportunities, threats, and a
--            readiness score — preparing Alyssa before everyone else. Implements
--            the Future Trends Lab on top of the tenant-scoped platform.
--
-- FUTURE TRENDS MODEL
--   - Each row is a TRACKED TREND over one horizon: 6_months, 1_year, 3_years,
--     5_years, or 10_years.
--   - `likelihood` and `impact` are 0..1 estimates; `readiness_score`
--     (likelihood × impact) frames how ready Alyssa should be.
--   - The row carries the affected industries/businesses, preparation steps,
--     skills/technology needed, investment opportunities, and potential threats.
--   - Trends are MUTABLE: estimates and plans are revised as the development
--     unfolds. updated_at is maintained by the shared trigger function
--     set_updated_at() defined in 0001 (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0122_trends_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trends — a tracked development over one horizon, with likelihood, impact, the
-- affected industries/businesses, preparation steps, skills/technology needed,
-- investment opportunities, potential threats, and a readiness score. Estimates
-- and plans are revised over time. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists trends (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  name                      text              not null,
  horizon                   text              not null
                                              check (horizon in (
                                                '6_months','1_year','3_years',
                                                '5_years','10_years')),
  description               text              not null default '',
  likelihood                double precision  not null
                                              check (likelihood >= 0 and likelihood <= 1),
  impact                    double precision  not null
                                              check (impact >= 0 and impact <= 1),
  industries_affected       jsonb             not null default '[]'::jsonb,
  businesses_affected       jsonb             not null default '[]'::jsonb,
  preparation_steps         jsonb             not null default '[]'::jsonb,
  skills_needed             jsonb             not null default '[]'::jsonb,
  technology_needed         jsonb             not null default '[]'::jsonb,
  investment_opportunities  jsonb             not null default '[]'::jsonb,
  potential_threats         jsonb             not null default '[]'::jsonb,
  readiness_score           double precision  not null
                                              check (readiness_score >= 0 and readiness_score <= 1),
  created_at                timestamptz       not null default now(),
  updated_at                timestamptz
);

create index if not exists trends_tenant_horizon_idx
  on trends (tenant_id, horizon);

-- -----------------------------------------------------------------------------
-- updated_at trigger for trends. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_trends on trends;
create trigger set_updated_at_trends
  before update on trends
  for each row execute function set_updated_at();

-- >>>>> 0122_trends_rls.sql >>>>>
-- =============================================================================
-- Migration: 0122_trends_rls.sql
-- Purpose:   Enable Row-Level Security on the Future Trends Lab `trends` table
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on trends (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table trends enable row level security;

-- =============================================================================
-- trends — mutable: estimates, preparation, and readiness are revised over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy trends_select on trends
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy trends_insert on trends
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy trends_update on trends
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy trends_delete on trends
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0123_briefings.sql >>>>>
-- =============================================================================
-- Migration: 0123_briefings.sql
-- Purpose:   Stand up the Alfy² Briefing Engine — a single `briefings` table
--            that stores the four assembled executive briefings (morning, lunch,
--            evening, weekly), each built from already-summarized inputs.
--            Implements the Briefing Engine on top of the tenant-scoped platform.
--
-- BRIEFING ENGINE MODEL
--   - Each row is an ASSEMBLED BRIEFING of one `kind`:
--       morning  — today's priorities, revenue, follow-ups, blocked, calendar,
--                  news lanes, agent recs (~5 min).
--       lunch    — a learning/intelligence update: top 3 worth reading, why,
--                  action, save/research/implement.
--       evening  — close the day: wins/losses/money, what didn't move,
--                  follow-ups, lessons, tomorrow; saves reflections to memory.
--       weekly   — a strategic intelligence report: opportunities, risks,
--                  updates, predictions, next-week focus.
--   - `sections` holds the assembled {heading, items} blocks; `questions` holds
--     the (evening) questions to close the day; `estimated_reading_minutes`
--     frames the read; `saved_reflection_count` records how many reflections
--     were persisted to Institutional Memory.
--   - Briefings are APPEND-ONLY: each is a dated, recorded assembly, not edited
--     in place. There is no updated_at and no trigger — each run appends a new
--     briefing rather than mutating an old one.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0124_briefings_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- briefings — an assembled executive briefing of one kind (morning, lunch,
-- evening, weekly). Holds the greeting, the assembled sections, the (evening)
-- questions, the estimated reading minutes, and the count of reflections saved
-- to Institutional Memory. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists briefings (
  id                          uuid              primary key default gen_random_uuid(),
  tenant_id                   uuid              not null,
  kind                        text              not null
                                                check (kind in (
                                                  'morning','lunch','evening','weekly')),
  date_label                  text              not null default '',
  greeting                    text              not null,
  sections                    jsonb             not null default '[]'::jsonb,
  questions                   jsonb             not null default '[]'::jsonb,
  estimated_reading_minutes   double precision  not null default 0,
  saved_reflection_count      integer           not null default 0,
  created_at                  timestamptz       not null default now()
);

create index if not exists briefings_tenant_kind_idx
  on briefings (tenant_id, kind);

-- >>>>> 0124_briefings_rls.sql >>>>>
-- =============================================================================
-- Migration: 0124_briefings_rls.sql
-- Purpose:   Enable Row-Level Security on the Briefing Engine `briefings` table
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002.
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
--   `briefings` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE of
--   UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing briefing immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on briefings (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table briefings enable row level security;

-- =============================================================================
-- briefings — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing briefing immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy briefings_select on briefings
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy briefings_insert on briefings
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0125_episode_plans.sql >>>>>
-- =============================================================================
-- Migration: 0125_episode_plans.sql
-- Purpose:   Stand up the Alfy² Podcast Studio OS feature — a single
--            `episode_plans` table that drives "Decoded with Alyssa DelTorre"
--            from idea to published episode to monetization. Derived from the
--            EpisodePlanSchema contract in packages/shared/src/contracts/
--            podcast-studio.ts. See docs/adr/ADR-0071-podcast-studio.md.
--
-- PODCAST STUDIO MODEL
--   - Each episode plan moves through a stage lifecycle:
--       idea → researched → scheduled → recorded → produced → published.
--   - For every idea the engine fleshes out a full plan: title, hook, premise,
--     why_now, target_audience, key_story, talking_points, guest_fit,
--     business_tie_in, monetization_angle, clips_to_create, cta,
--     related_businesses, and assets_needed.
--   - Array-shaped fields (talking_points, clips_to_create, related_businesses,
--     assets_needed) are stored as jsonb arrays.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0126_episode_plans_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- episode_plans — a fully fleshed podcast episode plan, carried through its
-- stage lifecycle from idea to published. Holds the creative brief (hook,
-- premise, why_now, key_story, talking_points), the business angle
-- (business_tie_in, monetization_angle, related_businesses), and the production
-- needs (clips_to_create, cta, assets_needed). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists episode_plans (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  stage               text        not null default 'idea'
                                  check (stage in (
                                    'idea','researched','scheduled',
                                    'recorded','produced','published')),
  title               text        not null,
  hook                text        not null,
  premise             text        not null,
  why_now             text        not null,
  target_audience     text        not null default '',
  key_story           text        not null default '',
  talking_points      jsonb       not null default '[]'::jsonb,
  guest_fit           text        not null default '',
  business_tie_in     text        not null default '',
  monetization_angle  text        not null default '',
  clips_to_create     jsonb       not null default '[]'::jsonb,
  cta                 text        not null default '',
  related_businesses  jsonb       not null default '[]'::jsonb,
  assets_needed       jsonb       not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

create index if not exists episode_plans_tenant_stage_idx
  on episode_plans (tenant_id, stage);

-- -----------------------------------------------------------------------------
-- updated_at trigger for episode_plans. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_episode_plans on episode_plans;
create trigger set_updated_at_episode_plans
  before update on episode_plans
  for each row execute function set_updated_at();

-- >>>>> 0126_episode_plans_rls.sql >>>>>
-- =============================================================================
-- Migration: 0126_episode_plans_rls.sql
-- Purpose:   Enable Row-Level Security on the Podcast Studio `episode_plans`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002 and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the episode_plans table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table episode_plans enable row level security;

-- =============================================================================
-- episode_plans — mutable: plans are created, researched, scheduled, recorded,
-- produced, and published over time. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy episode_plans_select on episode_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy episode_plans_insert on episode_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy episode_plans_update on episode_plans
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy episode_plans_delete on episode_plans
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0127_guest_records.sql >>>>>
-- =============================================================================
-- Migration: 0127_guest_records.sql
-- Purpose:   Stand up the Alfy² Podcast Guest Booking feature — a single
--            `guest_records` table that tracks guests FOR the show and target
--            shows to get Alyssa booked ON. Derived from the GuestRecordSchema
--            contract in packages/shared/src/contracts/podcast-guests.ts.
--            See docs/adr/ADR-0072-podcast-guests.md.
--
-- GUEST BOOKING MODEL
--   - `direction` distinguishes the two flows:
--       inbound_guest      — a guest FOR the show,
--       outbound_appearance — a target show to get Alyssa booked ON.
--   - Candidates are ranked 0..1 on relevance, credibility, audience_fit, and
--     business_value, which roll up into a weighted composite `rank_score`.
--   - Each record carries a booking status lifecycle:
--       candidate → approved_to_contact → contacted → replied →
--       scheduled → recorded (or declined).
--   - Outreach is DRAFTED but never sent until approved: `draft_outreach` holds
--     the draft and `outreach_approved` gates the send (unless persistent
--     approval exists).
--   - `relationship_value` (0..1) tracks the longer-term relationship worth.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0128_guest_records_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- guest_records — a tracked guest / appearance target. Carries the ranking
-- signals (relevance/credibility/audience_fit/business_value → rank_score), the
-- booking status lifecycle, the drafted-but-gated outreach (draft_outreach +
-- outreach_approved), and booking outcome (booked_date, episode_link). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists guest_records (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  direction           text              not null
                                        check (direction in (
                                          'inbound_guest','outbound_appearance')),
  name                text              not null,
  context             text              not null default '',
  relevance           double precision  not null
                                        check (relevance >= 0 and relevance <= 1),
  credibility         double precision  not null
                                        check (credibility >= 0 and credibility <= 1),
  audience_fit        double precision  not null
                                        check (audience_fit >= 0 and audience_fit <= 1),
  business_value      double precision  not null
                                        check (business_value >= 0 and business_value <= 1),
  rank_score          double precision  not null
                                        check (rank_score >= 0 and rank_score <= 1),
  status              text              not null default 'candidate'
                                        check (status in (
                                          'candidate','approved_to_contact','contacted',
                                          'replied','scheduled','recorded','declined')),
  pitch_angle         text              not null default '',
  draft_outreach      text              not null default '',
  outreach_approved   boolean           not null default false,
  booked_date         timestamptz,
  episode_link        text              not null default '',
  relationship_value  double precision  not null
                                        check (relationship_value >= 0 and relationship_value <= 1),
  created_at          timestamptz       not null default now(),
  updated_at          timestamptz
);

create index if not exists guest_records_tenant_direction_idx
  on guest_records (tenant_id, direction);

create index if not exists guest_records_tenant_status_idx
  on guest_records (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for guest_records. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_guest_records on guest_records;
create trigger set_updated_at_guest_records
  before update on guest_records
  for each row execute function set_updated_at();

-- >>>>> 0128_guest_records_rls.sql >>>>>
-- =============================================================================
-- Migration: 0128_guest_records_rls.sql
-- Purpose:   Enable Row-Level Security on the Podcast Guest Booking
--            `guest_records` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002 and
--            0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the guest_records table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table guest_records enable row level security;

-- =============================================================================
-- guest_records — mutable: candidates are ranked, approved, contacted, tracked
-- through replies, scheduled, and recorded over time. select/insert/update/
-- delete, all tenant-scoped.
-- =============================================================================
create policy guest_records_select on guest_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy guest_records_insert on guest_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy guest_records_update on guest_records
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy guest_records_delete on guest_records
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0129_pr_strategies.sql >>>>>
-- =============================================================================
-- Migration: 0129_pr_strategies.sql
-- Purpose:   Stand up the Alfy² PR Strategy feature — a single `pr_strategies`
--            table holding the public-relations / press strategy for a business:
--            its media angles, target publications and podcasts, founder story,
--            credibility proof, press-kit checklist, outreach templates, and
--            reputation risks. PR is now a standard business department (see
--            0131_business_departments_pr.sql).
--
-- PR STRATEGY MODEL
--   - Each row is a PR strategy for one business (business_name + optional
--     business_id FK-style reference to businesses.id).
--   - List-shaped fields (media_angles, target_publications, podcast_targets,
--     credibility_proof, press_kit_checklist, outreach_templates,
--     reputation_risks) are stored as jsonb arrays.
--   - founder_story_angle is the required narrative spine of the strategy.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0130_pr_strategies_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pr_strategies — the PR / press strategy for a business: media angles, target
-- publications and podcasts, the founder story angle, credibility proof, a
-- press-kit checklist, outreach templates, and reputation risks. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists pr_strategies (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  business_name        text        not null,
  business_id          uuid,
  media_angles         jsonb       not null default '[]'::jsonb,
  target_publications  jsonb       not null default '[]'::jsonb,
  podcast_targets      jsonb       not null default '[]'::jsonb,
  founder_story_angle  text        not null,
  credibility_proof    jsonb       not null default '[]'::jsonb,
  press_kit_checklist  jsonb       not null default '[]'::jsonb,
  outreach_templates   jsonb       not null default '[]'::jsonb,
  reputation_risks     jsonb       not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

create index if not exists pr_strategies_tenant_business_name_idx
  on pr_strategies (tenant_id, business_name);

-- -----------------------------------------------------------------------------
-- updated_at trigger for pr_strategies. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_pr_strategies on pr_strategies;
create trigger set_updated_at_pr_strategies
  before update on pr_strategies
  for each row execute function set_updated_at();

-- >>>>> 0130_pr_strategies_rls.sql >>>>>
-- =============================================================================
-- Migration: 0130_pr_strategies_rls.sql
-- Purpose:   Enable Row-Level Security on the PR Strategy `pr_strategies` table
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002 and 0025.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the pr_strategies table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table pr_strategies enable row level security;

-- =============================================================================
-- pr_strategies — mutable: a business's PR strategy is created and refined over
-- time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy pr_strategies_select on pr_strategies
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_strategies_insert on pr_strategies
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_strategies_update on pr_strategies
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_strategies_delete on pr_strategies
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0131_business_departments_pr.sql >>>>>
-- =============================================================================
-- Migration: 0131_business_departments_pr.sql
-- Purpose:   Add PR as a 13th standard business department. PR (public relations
--            / press) joins the twelve departments instantiated per business in
--            0005_business.sql, alongside the new pr_strategies feature
--            (0129/0130). This widens the CHECK constraint on
--            business_departments.kind to also allow 'pr'.
--
-- WHAT 0005 DEFINED
--   0005_business.sql created `business_departments` with a `kind` column
--   carrying an INLINE (anonymous) CHECK constraint listing the twelve standard
--   departments:
--       ceo, operations, sales, marketing, finance, legal, customer_success,
--       projects, product, analytics, deployment, automation
--   An inline column CHECK with no explicit name is auto-named by PostgreSQL
--   using the pattern <table>_<column>_check — i.e.
--   `business_departments_kind_check`.
--
-- WHAT THIS MIGRATION DOES
--   Drops that constraint (idempotently, by its conventional auto-generated
--   name) and re-adds an explicitly named constraint that keeps all twelve
--   existing values and ADDS 'pr'. Drop-if-exists then add makes this
--   re-runnable.
--
-- This change is additive: existing department rows remain valid, and the
-- pr_strategies feature is gated by its own table/RLS, not by this constraint.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Widen business_departments.kind to allow the new 'pr' department.
-- Drop the existing CHECK (by both its auto-generated name from 0005 and the
-- explicit name we add below, so this is idempotent regardless of prior runs),
-- then re-add a named CHECK covering the original twelve departments plus 'pr'.
-- -----------------------------------------------------------------------------
alter table business_departments
  drop constraint if exists business_departments_kind_check;

alter table business_departments
  drop constraint if exists business_departments_kind_check_v2;

alter table business_departments
  add constraint business_departments_kind_check_v2
  check (kind in (
    'ceo','operations','sales','marketing','finance',
    'legal','customer_success','projects','product',
    'analytics','deployment','automation','pr'
  ));

-- >>>>> 0132_stories.sql >>>>>
-- =============================================================================
-- Migration: 0132_stories.sql
-- Purpose:   Stand up the Alfy² Story Mining Engine — a single `stories` table
--            that captures every business experience as a reusable story (hook,
--            conflict, lesson, emotion, transformation, why it matters, audience,
--            business tie-in, CTA, proof needed, best channels, urgency). Implements
--            Story Mining on top of the tenant-scoped platform. See
--            docs/adr/ADR-0074-story-mining.md.
--
-- STORY MINING MODEL
--   - Each row is a CAPTURE RECORD: the engine mines one raw experience into a
--     story and writes it out. The raw experience came from one of twelve sources
--     (business_activity, intelligence_update, failure, win, client_story, meeting,
--     travel, technology, personal_lesson, relationship, news, book).
--   - `best_channels` records which of the story channels (podcast, pr, social,
--     newsletter, sales, investor_update, talk, case_study) the story serves.
--   - `urgency` frames how time-sensitive the story is
--     (evergreen, this_month, this_week, now).
--   - Stories are APPEND-ONLY: a mined story is a recorded capture, not edited in
--     place. There is no updated_at and no trigger — re-mining appends new rows
--     rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0133_stories_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- stories — a mined story captured from one raw experience, with its hook,
-- conflict, lesson, emotion, transformation, why it matters, audience, business
-- tie-in, CTA, proof needed, best channels, and urgency. Append-only (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists stories (
  id               uuid              primary key default gen_random_uuid(),
  tenant_id        uuid              not null,
  source           text              not null
                                     check (source in (
                                       'business_activity','intelligence_update','failure',
                                       'win','client_story','meeting','travel','technology',
                                       'personal_lesson','relationship','news','book')),
  hook             text              not null,
  conflict         text              not null default '',
  lesson           text              not null default '',
  emotion          text              not null default '',
  transformation   text              not null default '',
  why_it_matters   text              not null,
  audience         text              not null default '',
  business_tie_in  text              not null default '',
  cta              text              not null default '',
  proof_needed     jsonb             not null default '[]'::jsonb,
  best_channels    jsonb             not null default '[]'::jsonb,
  urgency          text              not null default 'evergreen'
                                     check (urgency in (
                                       'evergreen','this_month','this_week','now')),
  business_id      uuid,
  created_at       timestamptz       not null default now()
);

create index if not exists stories_tenant_source_idx
  on stories (tenant_id, source);

-- >>>>> 0133_stories_rls.sql >>>>>
-- =============================================================================
-- Migration: 0133_stories_rls.sql
-- Purpose:   Enable Row-Level Security on the Story Mining `stories` table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies. Mirrors
--            the tenancy model from 0002.
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
-- APPEND-ONLY
--   `stories` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE of
--   UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing story immutable — no caller can mutate or remove it. This matches
--   the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on stories (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table stories enable row level security;

-- =============================================================================
-- stories — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing story immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy stories_select on stories
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy stories_insert on stories
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0134_media_jobs.sql >>>>>
-- =============================================================================
-- Migration: 0134_media_jobs.sql
-- Purpose:   Stand up the Alfy² Media Operating System — a single `media_jobs`
--            table that transforms one raw moment into many finished, brand-correct
--            media assets. Implements the Media OS on top of the tenant-scoped
--            platform. See docs/adr/ADR-0075-media-os.md.
--
-- MEDIA OS MODEL
--   - Each row is ONE MEDIA JOB: one raw input → many produced assets. The input
--     is one of eleven kinds (raw_video, podcast, photo, screenshot, voice_note,
--     written_thought, meeting_recording, interview, webinar, presentation,
--     livestream).
--   - `assets` holds the produced media assets (a plan/reference; rendering happens
--     downstream after approval) — each carries its own output kind, title,
--     caption outline, CTA, and Asset Library reference.
--   - A job moves through a status lifecycle:
--       queued → processing → awaiting_approval → approved → scheduled.
--   - `requires_approval` is always true — nothing publishes until Alyssa approves.
--   - Mutable: a job's status and assets change as it is processed.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0135_media_jobs_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- media_jobs — a media job: one raw input transformed into many produced assets.
-- Carries an input kind, brand, status lifecycle, the produced assets plan, and a
-- standing approval gate (nothing publishes until approved). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists media_jobs (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  kind               text              not null
                                       check (kind in (
                                         'raw_video','podcast','photo','screenshot','voice_note',
                                         'written_thought','meeting_recording','interview','webinar',
                                         'presentation','livestream')),
  title              text              not null,
  brand              text              not null default '',
  business_id        uuid,
  status             text              not null default 'queued'
                                       check (status in (
                                         'queued','processing','awaiting_approval',
                                         'approved','scheduled')),
  assets             jsonb             not null default '[]'::jsonb,
  requires_approval  boolean           not null default true,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz
);

create index if not exists media_jobs_tenant_status_idx
  on media_jobs (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for media_jobs. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_media_jobs on media_jobs;
create trigger set_updated_at_media_jobs
  before update on media_jobs
  for each row execute function set_updated_at();

-- >>>>> 0135_media_jobs_rls.sql >>>>>
-- =============================================================================
-- Migration: 0135_media_jobs_rls.sql
-- Purpose:   Enable Row-Level Security on the Media OS `media_jobs` table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies. Mirrors
--            the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the media_jobs table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table media_jobs enable row level security;

-- =============================================================================
-- media_jobs — mutable: jobs are queued, processed, approved, and scheduled over
-- time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy media_jobs_select on media_jobs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy media_jobs_insert on media_jobs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy media_jobs_update on media_jobs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy media_jobs_delete on media_jobs
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0136_brands.sql >>>>>
-- =============================================================================
-- Migration: 0136_brands.sql
-- Purpose:   Stand up the Alfy² Brand DNA Engine — a single `brands` table that
--            stores each brand's full identity (voice, tone, writing style,
--            audience, pillars, visual identity, approved assets) so the Media OS
--            always knows which brand a piece of content belongs to and applies the
--            right voice, rules, and assets. Implements Brand DNA on top of the
--            tenant-scoped platform. See docs/adr/ADR-0076-brand-dna.md.
--
-- BRAND DNA MODEL
--   - Each row is ONE BRAND's identity, keyed by one of nine brand keys
--     (alyssa_personal, decoded_podcast, funsies_ai, move_mi, divini_partners,
--     divini_procure, stratalogic, founderos, oralia).
--   - `humor_level` and `professionalism` are 0..1 dials (0 = none, 1 = max).
--   - The array fields (content pillars, hashtags, forbidden topics, approved
--     terminology, preferred colors, approved sponsor blocks, approved templates)
--     are stored as jsonb.
--   - A brand's DNA is upserted/edited over time (overrides over seeded defaults),
--     so the table is Mutable.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0137_brands_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- brands — a brand's full identity: voice, tone, writing style, humor and
-- professionalism dials, audience, content pillars, visual identity, CTA style,
-- posting cadence, and the approved asset set (intro, outro, music, sponsor
-- blocks, templates). Keyed by brand; unique per tenant. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists brands (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  key                       text              not null
                                              check (key in (
                                                'alyssa_personal','decoded_podcast','funsies_ai',
                                                'move_mi','divini_partners','divini_procure',
                                                'stratalogic','founderos','oralia')),
  name                      text              not null,
  voice                     text              not null default '',
  tone                      text              not null default '',
  writing_style             text              not null default '',
  humor_level               double precision  not null default 0.3
                                              check (humor_level >= 0 and humor_level <= 1),
  professionalism           double precision  not null default 0.7
                                              check (professionalism >= 0 and professionalism <= 1),
  target_audience           text              not null default '',
  content_pillars           jsonb             not null default '[]'::jsonb,
  visual_identity           text              not null default '',
  cta_style                 text              not null default '',
  posting_cadence           text              not null default '',
  hashtags                  jsonb             not null default '[]'::jsonb,
  forbidden_topics          jsonb             not null default '[]'::jsonb,
  approved_terminology      jsonb             not null default '[]'::jsonb,
  preferred_colors          jsonb             not null default '[]'::jsonb,
  approved_intro            text              not null default '',
  approved_outro            text              not null default '',
  approved_music            text              not null default '',
  approved_sponsor_blocks   jsonb             not null default '[]'::jsonb,
  approved_templates        jsonb             not null default '[]'::jsonb,
  created_at                timestamptz       not null default now(),
  updated_at                timestamptz,
  unique (tenant_id, key)
);

create index if not exists brands_tenant_key_idx
  on brands (tenant_id, key);

-- -----------------------------------------------------------------------------
-- updated_at trigger for brands. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_brands on brands;
create trigger set_updated_at_brands
  before update on brands
  for each row execute function set_updated_at();

-- >>>>> 0137_brands_rls.sql >>>>>
-- =============================================================================
-- Migration: 0137_brands_rls.sql
-- Purpose:   Enable Row-Level Security on the Brand DNA `brands` table with a
--            DENY-BY-DEFAULT posture, then add tenant-isolation policies. Mirrors
--            the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the brands table (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table brands enable row level security;

-- =============================================================================
-- brands — mutable: a brand's DNA is upserted and edited over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy brands_select on brands
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brands_insert on brands
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brands_update on brands
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy brands_delete on brands
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0138_content_packages.sql >>>>>
-- =============================================================================
-- Migration: 0138_content_packages.sql
-- Purpose:   Stand up the Alfy² Content Factory — a single `content_packages`
--            table that records the full, linked package one source produces (1
--            long YouTube, 5 Shorts, 5 Reels, 10 X posts, 5 LinkedIn posts, 3
--            carousels, a newsletter, a blog, podcast clips, a website article, an
--            email, a sales asset, a PR angle, a speaker story, a case study) — all
--            linked to the source so nothing is ever created twice. Implements the
--            Content Factory on top of the tenant-scoped platform. See
--            docs/adr/ADR-0077-content-factory.md.
--
-- CONTENT FACTORY MODEL
--   - Each row is ONE COMPLETE PACKAGE: all derivatives linked to one source.
--   - `pieces` holds the produced pieces — each carries its own kind, index,
--     title, and Asset Library reference — and `total_pieces` records the count.
--   - Packages are APPEND-ONLY: a produced package is a recorded build, not edited
--     in place. There is no updated_at and no trigger — rebuilding appends new
--     packages rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only, so it has
--     none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0139_content_packages_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- content_packages — a complete content package: all derivatives linked to one
-- source. Carries the source title/reference, brand, the produced pieces, and the
-- total piece count. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists content_packages (
  id            uuid              primary key default gen_random_uuid(),
  tenant_id     uuid              not null,
  source_title  text              not null,
  source_ref    text              not null default '',
  brand         text              not null default '',
  business_id   uuid,
  pieces        jsonb             not null default '[]'::jsonb,
  total_pieces  integer           not null default 0,
  created_at    timestamptz       not null default now()
);

create index if not exists content_packages_tenant_created_idx
  on content_packages (tenant_id, created_at);

-- >>>>> 0139_content_packages_rls.sql >>>>>
-- =============================================================================
-- Migration: 0139_content_packages_rls.sql
-- Purpose:   Enable Row-Level Security on the Content Factory `content_packages`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
-- APPEND-ONLY
--   `content_packages` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing package immutable — no caller can mutate or remove it. This matches
--   the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on content_packages (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table content_packages enable row level security;

-- =============================================================================
-- content_packages — APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing package immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy content_packages_select on content_packages
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy content_packages_insert on content_packages
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0140_production_assets.sql >>>>>
-- =============================================================================
-- Migration: 0140_production_assets.sql
-- Purpose:   Stand up the Alfy² Production Studio — a single `production_assets`
--            table that stores reusable production assets (intros, outros, sponsor
--            ads, music, transitions, brand animations, logos, watermarks, b-roll,
--            fonts, graphics, lower thirds, episode/video/thumbnail templates,
--            caption styles, editing rules) per brand. Implements the Production
--            Studio on top of the tenant-scoped platform. See
--            docs/adr/ADR-0078-production-studio.md.
--
-- PRODUCTION STUDIO MODEL
--   - Each row is ONE STORED PRODUCTION ASSET (a reference, never the payload),
--     scoped to one brand (one of nine: alyssa_personal, decoded_podcast,
--     funsies_ai, move_mi, divini_partners, divini_procure, stratalogic,
--     founderos, oralia).
--   - `kind` is one of seventeen production asset kinds (intro, outro, sponsor_ad,
--     music, transition, brand_animation, logo, watermark, b_roll, font, graphic,
--     lower_third, episode_template, video_template, thumbnail_template,
--     caption_style, editing_rule).
--   - `asset_ref` points at the underlying asset in the Asset Library.
--   - Mutable: stored assets are renamed and repointed over time.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0141_production_assets_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- production_assets — a stored, reusable production asset (reference, never the
-- payload), scoped to one brand and one of seventeen production asset kinds.
-- Mutable.
-- -----------------------------------------------------------------------------
create table if not exists production_assets (
  id          uuid              primary key default gen_random_uuid(),
  tenant_id   uuid              not null,
  brand       text              not null
                                check (brand in (
                                  'alyssa_personal','decoded_podcast','funsies_ai','move_mi',
                                  'divini_partners','divini_procure','stratalogic','founderos','oralia')),
  kind        text              not null
                                check (kind in (
                                  'intro','outro','sponsor_ad','music','transition','brand_animation',
                                  'logo','watermark','b_roll','font','graphic','lower_third',
                                  'episode_template','video_template','thumbnail_template',
                                  'caption_style','editing_rule')),
  name        text              not null,
  asset_ref   text              not null default '',
  created_at  timestamptz       not null default now(),
  updated_at  timestamptz
);

create index if not exists production_assets_tenant_brand_idx
  on production_assets (tenant_id, brand);

-- -----------------------------------------------------------------------------
-- updated_at trigger for production_assets. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_production_assets on production_assets;
create trigger set_updated_at_production_assets
  before update on production_assets
  for each row execute function set_updated_at();

-- >>>>> 0141_production_assets_rls.sql >>>>>
-- =============================================================================
-- Migration: 0141_production_assets_rls.sql
-- Purpose:   Enable Row-Level Security on the Production Studio `production_assets`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the production_assets table (deny-by-default until policies are
-- added).
-- -----------------------------------------------------------------------------
alter table production_assets enable row level security;

-- =============================================================================
-- production_assets — mutable: stored assets are renamed and repointed over time.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy production_assets_select on production_assets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy production_assets_insert on production_assets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy production_assets_update on production_assets
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy production_assets_delete on production_assets
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0142_production_presets.sql >>>>>
-- =============================================================================
-- Migration: 0142_production_presets.sql
-- Purpose:   Stand up the Alfy² Production Studio per-brand preset — a single
--            `production_presets` table that holds, per brand, the automated
--            post-approval production pipeline. Implements Production Studio on
--            top of the tenant-scoped platform.
--
-- PRODUCTION STUDIO MODEL
--   - Each row is ONE preset for ONE brand: the reusable intro/outro, where
--     sponsor blocks get inserted (`sponsor_placement`), the graphics style, and
--     the ordered `auto_steps` that run automatically AFTER approval (e.g.
--     Decoded: Intro A, Outro B, Sponsor 1 after the first topic, blue graphics,
--     chapters, subtitles, clips, show notes, description, schedule).
--   - `brand` is one of the nine Alfy² brands.
--   - A preset is edited over time as the brand's production recipe evolves, so
--     the table is MUTABLE: it carries updated_at and the shared trigger.
--   - One preset per brand per tenant — `unique (tenant_id, brand)` — matching the
--     upsert semantics in the contract.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0143_production_presets_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- production_presets — a per-brand automated post-approval production pipeline.
-- Holds the intro/outro, sponsor placement, graphics style, and the ordered
-- auto_steps the engine runs after approval. One per (tenant, brand). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists production_presets (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  brand              text              not null
                                       check (brand in (
                                         'alyssa_personal','decoded_podcast','funsies_ai',
                                         'move_mi','divini_partners','divini_procure',
                                         'stratalogic','founderos','oralia')),
  intro              text              not null default '',
  outro              text              not null default '',
  sponsor_placement  text              not null default '',
  graphics_style     text              not null default '',
  auto_steps         jsonb             not null default '[]'::jsonb,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz,
  unique (tenant_id, brand)
);

create index if not exists production_presets_tenant_brand_idx
  on production_presets (tenant_id, brand);

-- -----------------------------------------------------------------------------
-- updated_at trigger for production_presets. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_production_presets on production_presets;
create trigger set_updated_at_production_presets
  before update on production_presets
  for each row execute function set_updated_at();

-- >>>>> 0143_production_presets_rls.sql >>>>>
-- =============================================================================
-- Migration: 0143_production_presets_rls.sql
-- Purpose:   Enable Row-Level Security on the Production Studio
--            `production_presets` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on production_presets (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table production_presets enable row level security;

-- =============================================================================
-- production_presets — mutable: presets are created and edited (upserted) per
-- brand over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy production_presets_select on production_presets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy production_presets_insert on production_presets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy production_presets_update on production_presets
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy production_presets_delete on production_presets
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0144_visibility_reports.sql >>>>>
-- =============================================================================
-- Migration: 0144_visibility_reports.sql
-- Purpose:   Stand up the Alfy² Visibility Engine output — a single
--            `visibility_reports` table that stores a computed visibility report
--            per business: a 0..1 composite Visibility Score plus where/what/when
--            to post, who to collaborate with, which podcasts to appear on, which
--            conferences to speak at, which awards to apply for, and the weakest
--            signals. Implements the Visibility Engine on top of the
--            tenant-scoped platform.
--
-- VISIBILITY ENGINE MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REPORT for one business: the engine
--     scores the business's visibility signals and writes out the conclusions as
--     a dated report.
--   - `visibility_score` is the 0..1 composite the report is framed around.
--   - The recommendation fields (where_to_post, what_to_post, collaborators,
--     podcasts_to_appear_on, conferences_to_speak_at, awards_to_apply_for,
--     weakest_signals) are arrays; `when_to_post` is free text.
--   - Reports are APPEND-ONLY: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new reports rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0145_visibility_reports_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- visibility_reports — a computed point-in-time visibility report for one
-- business. Holds the 0..1 visibility score and the engine's recommendations on
-- where/what/when to post, collaborators, podcasts, conferences, awards, and the
-- weakest signals. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists visibility_reports (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  business_name            text              not null,
  visibility_score         double precision  not null default 0
                                             check (visibility_score >= 0 and visibility_score <= 1),
  where_to_post            jsonb             not null default '[]'::jsonb,
  what_to_post             jsonb             not null default '[]'::jsonb,
  when_to_post             text              not null default '',
  collaborators            jsonb             not null default '[]'::jsonb,
  podcasts_to_appear_on    jsonb             not null default '[]'::jsonb,
  conferences_to_speak_at  jsonb             not null default '[]'::jsonb,
  awards_to_apply_for      jsonb             not null default '[]'::jsonb,
  weakest_signals          jsonb             not null default '[]'::jsonb,
  created_at               timestamptz       not null default now()
);

create index if not exists visibility_reports_tenant_created_idx
  on visibility_reports (tenant_id, created_at);

-- >>>>> 0145_visibility_reports_rls.sql >>>>>
-- =============================================================================
-- Migration: 0145_visibility_reports_rls.sql
-- Purpose:   Enable Row-Level Security on the Visibility Engine
--            `visibility_reports` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- POINT-IN-TIME / APPEND-ONLY
--   `visibility_reports` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing report immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on visibility_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table visibility_reports enable row level security;

-- =============================================================================
-- visibility_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy visibility_reports_select on visibility_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy visibility_reports_insert on visibility_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0146_pr_opportunities.sql >>>>>
-- =============================================================================
-- Migration: 0146_pr_opportunities.sql
-- Purpose:   Stand up the Alfy² PR & Authority Engine output — a single
--            `pr_opportunities` table that holds detected PR opportunities, each
--            with a drafted (un-sent) pitch awaiting approval. Implements the
--            PR & Authority Engine on top of the tenant-scoped platform.
--
-- PR & AUTHORITY MODEL
--   - Each row is ONE detected PR opportunity, created by one of six triggers:
--       company_launch, major_partnership, funding, customer_win,
--       industry_trend, technology_innovation.
--   - The engine drafts an angle, target outlets, the pitch itself, and the
--     credibility assets the pitch needs; `target_outlets` and
--     `credibility_assets_needed` are arrays.
--   - An opportunity moves through a lifecycle:
--       identified → pitch_drafted → approved → sent → won (or passed).
--   - Pitches are NEVER sent without approval: `approved_to_send` defaults false
--     and must be flipped explicitly before the engine sends.
--   - An opportunity is worked over time (status changes, pitch edits, approval),
--     so the table is MUTABLE: it carries updated_at and the shared trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0147_pr_opportunities_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pr_opportunities — a detected PR opportunity with a drafted, un-sent pitch.
-- Created by one of six triggers, carries an angle, target outlets, the pitch,
-- and the credibility assets it needs, and moves through a status lifecycle.
-- Pitches are never sent without approval (approved_to_send). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists pr_opportunities (
  id                         uuid              primary key default gen_random_uuid(),
  tenant_id                  uuid              not null,
  trigger                    text              not null
                                               check (trigger in (
                                                 'company_launch','major_partnership','funding',
                                                 'customer_win','industry_trend','technology_innovation')),
  headline                   text              not null,
  business_name              text              not null default '',
  angle                      text              not null,
  target_outlets             jsonb             not null default '[]'::jsonb,
  drafted_pitch              text              not null,
  credibility_assets_needed  jsonb             not null default '[]'::jsonb,
  status                     text              not null default 'identified'
                                               check (status in (
                                                 'identified','pitch_drafted','approved',
                                                 'sent','won','passed')),
  approved_to_send           boolean           not null default false,
  created_at                 timestamptz       not null default now(),
  updated_at                 timestamptz
);

create index if not exists pr_opportunities_tenant_status_idx
  on pr_opportunities (tenant_id, status);

-- -----------------------------------------------------------------------------
-- updated_at trigger for pr_opportunities. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_pr_opportunities on pr_opportunities;
create trigger set_updated_at_pr_opportunities
  before update on pr_opportunities
  for each row execute function set_updated_at();

-- >>>>> 0147_pr_opportunities_rls.sql >>>>>
-- =============================================================================
-- Migration: 0147_pr_opportunities_rls.sql
-- Purpose:   Enable Row-Level Security on the PR & Authority `pr_opportunities`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on pr_opportunities (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table pr_opportunities enable row level security;

-- =============================================================================
-- pr_opportunities — mutable: opportunities are detected, pitched, approved,
-- sent, won, or passed over time. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy pr_opportunities_select on pr_opportunities
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_opportunities_insert on pr_opportunities
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_opportunities_update on pr_opportunities
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy pr_opportunities_delete on pr_opportunities
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0148_audience_profiles.sql >>>>>
-- =============================================================================
-- Migration: 0148_audience_profiles.sql
-- Purpose:   Stand up the Alfy² Audience Intelligence output — a single
--            `audience_profiles` table that holds, per audience, a distilled
--            profile: its biggest fears and goals, the language it uses, its
--            objections, desires, misconceptions, favorite content, and best
--            offers, plus the single highest-impact messaging recommendation.
--            Implements Audience Intelligence on top of the tenant-scoped
--            platform.
--
-- AUDIENCE INTELLIGENCE MODEL
--   - Each row is ONE profile for ONE named audience, distilled from the raw
--     signals (questions, comments, DMs, emails, sales calls, feedback, searches,
--     support tickets) the engine ingests.
--   - The eight list fields (biggest_fears, biggest_goals, language_used,
--     objections, desires, misconceptions, favorite_content, best_offers) are
--     arrays; `messaging_recommendation` is the single highest-impact change and
--     `signal_count` records how many signals fed the profile.
--   - A profile is re-derived as new signals arrive, so the engine UPSERTS it:
--     the table is MUTABLE, carries updated_at + the shared trigger, and is keyed
--     `unique (tenant_id, audience_name)`.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0149_audience_profiles_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- audience_profiles — a distilled profile for one named audience: its fears,
-- goals, language, objections, desires, misconceptions, favorite content, and
-- best offers, plus the highest-impact messaging recommendation and the count of
-- signals it was built from. Upserted per (tenant, audience_name). Mutable.
-- -----------------------------------------------------------------------------
create table if not exists audience_profiles (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  audience_name             text              not null,
  business_id               uuid,
  biggest_fears             jsonb             not null default '[]'::jsonb,
  biggest_goals             jsonb             not null default '[]'::jsonb,
  language_used             jsonb             not null default '[]'::jsonb,
  objections                jsonb             not null default '[]'::jsonb,
  desires                   jsonb             not null default '[]'::jsonb,
  misconceptions            jsonb             not null default '[]'::jsonb,
  favorite_content          jsonb             not null default '[]'::jsonb,
  best_offers               jsonb             not null default '[]'::jsonb,
  messaging_recommendation  text              not null,
  signal_count              integer           not null default 0 check (signal_count >= 0),
  created_at                timestamptz       not null default now(),
  updated_at                timestamptz,
  unique (tenant_id, audience_name)
);

create index if not exists audience_profiles_tenant_name_idx
  on audience_profiles (tenant_id, audience_name);

-- -----------------------------------------------------------------------------
-- updated_at trigger for audience_profiles. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_audience_profiles on audience_profiles;
create trigger set_updated_at_audience_profiles
  before update on audience_profiles
  for each row execute function set_updated_at();

-- >>>>> 0149_audience_profiles_rls.sql >>>>>
-- =============================================================================
-- Migration: 0149_audience_profiles_rls.sql
-- Purpose:   Enable Row-Level Security on the Audience Intelligence
--            `audience_profiles` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on audience_profiles (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table audience_profiles enable row level security;

-- =============================================================================
-- audience_profiles — mutable: profiles are upserted and re-derived as new
-- signals arrive. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy audience_profiles_select on audience_profiles
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audience_profiles_insert on audience_profiles
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audience_profiles_update on audience_profiles
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy audience_profiles_delete on audience_profiles
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0150_freedom_reports.sql >>>>>
-- =============================================================================
-- Migration: 0150_freedom_reports.sql
-- Purpose:   Stand up the Alfy² Personal Freedom Engine — a single
--            `freedom_reports` table that stores each week's computed freedom
--            report for the operator. The mission is maximum life, not maximum
--            work: every report measures offloadable (low-leverage machine) hours
--            against life hours and emits freedom recommendations that preserve
--            or improve business performance. Implements the Personal Freedom
--            Engine (ADR-0082) on top of the tenant-scoped platform.
--
-- PERSONAL FREEDOM MODEL
--   - Each row is a COMPUTED POINT-IN-TIME report for one week (`week_label`):
--     the engine analyzes the week's time allocation and writes the conclusions
--     out as a dated report.
--   - `offloadable_hours` are the low-leverage machine hours (editing + approving)
--     that should be offloaded; `life_hours` are the hours spent living
--     (outdoors/exercise/family/friends/travel/creative/rest); `freedom_score`
--     (0..1) is the share of time spent living vs grinding.
--   - `recommendations` holds the freedom recommendations (automate, delegate,
--     create_agent, improve_workflow, batch_process) — each only made when it
--     preserves or improves performance.
--   - Reports are APPEND-ONLY / IMMUTABLE: a row is a recorded computation, not
--     edited in place. There is no updated_at and no trigger — successive
--     computations append new reports rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0151_freedom_reports_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- freedom_reports — a computed point-in-time freedom report for one week. Holds
-- offloadable (low-leverage machine) hours, life hours, the freedom score, and
-- the freedom recommendations. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists freedom_reports (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  week_label         text              not null default '',
  offloadable_hours  double precision  not null default 0,
  life_hours         double precision  not null default 0,
  freedom_score      double precision  not null default 0,
  recommendations    jsonb             not null default '[]'::jsonb,
  created_at         timestamptz       not null default now()
);

create index if not exists freedom_reports_tenant_created_idx
  on freedom_reports (tenant_id, created_at);

-- >>>>> 0151_freedom_reports_rls.sql >>>>>
-- =============================================================================
-- Migration: 0151_freedom_reports_rls.sql
-- Purpose:   Enable Row-Level Security on the Personal Freedom `freedom_reports`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
--   `freedom_reports` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing report immutable — no caller can mutate or remove it. This matches
--   the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on freedom_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table freedom_reports enable row level security;

-- =============================================================================
-- freedom_reports — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy freedom_reports_select on freedom_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy freedom_reports_insert on freedom_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0152_legacy_items.sql >>>>>
-- =============================================================================
-- Migration: 0152_legacy_items.sql
-- Purpose:   Stand up the Alfy² Legacy Engine — a single `legacy_items` table
--            that captures every meaningful framework, playbook, operating
--            manual, podcast lesson, book, talk, business system, decision
--            journal, mistake, and success, and records the legacy forms each
--            piece of repeatable knowledge should become. Implements the Legacy
--            Engine (ADR-0083) on top of the tenant-scoped platform.
--
-- LEGACY MODEL
--   - Each row is a CAPTURED legacy item of one `kind` (ten kinds spanning the
--     operator's body of IP), with its title and detail.
--   - `repeatability` (0..1) and `strategic_value` (0..1) drive the engine's
--     `recommended_forms` (sop, founderos_feature, course, podcast_episode,
--     keynote, book_chapter, licensing_opportunity, consulting_framework) and
--     the `legacy_score` (0..1, long-term legacy value = repeatability ×
--     strategic value, weighted).
--   - Captured items are APPEND-ONLY / IMMUTABLE: a row is a recorded capture,
--     not edited in place. There is no updated_at and no trigger — re-capturing
--     appends new items rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0153_legacy_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- legacy_items — a captured legacy item of one kind, with its repeatability,
-- strategic value, recommended legacy forms, and legacy score. Append-only
-- (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists legacy_items (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  kind               text              not null
                                       check (kind in (
                                         'framework','playbook','operating_manual',
                                         'podcast_lesson','book','talk','business_system',
                                         'decision_journal','mistake','success')),
  title              text              not null,
  detail             text              not null default '',
  repeatability      double precision  not null default 0.5 check (repeatability >= 0 and repeatability <= 1),
  strategic_value    double precision  not null default 0.5 check (strategic_value >= 0 and strategic_value <= 1),
  recommended_forms  jsonb             not null default '[]'::jsonb,
  legacy_score       double precision  not null default 0 check (legacy_score >= 0 and legacy_score <= 1),
  created_at         timestamptz       not null default now()
);

create index if not exists legacy_items_tenant_kind_idx
  on legacy_items (tenant_id, kind);

-- >>>>> 0153_legacy_items_rls.sql >>>>>
-- =============================================================================
-- Migration: 0153_legacy_items_rls.sql
-- Purpose:   Enable Row-Level Security on the Legacy Engine `legacy_items` table
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002.
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
--   `legacy_items` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE of
--   UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing item immutable — no caller can mutate or remove it. This matches
--   the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on legacy_items (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table legacy_items enable row level security;

-- =============================================================================
-- legacy_items — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing item immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy legacy_items_select on legacy_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy legacy_items_insert on legacy_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0154_compounding_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0154_compounding_evaluations.sql
-- Purpose:   Stand up the Alfy² Compounding Engine — a single
--            `compounding_evaluations` table that records, for each completed
--            task, whether it can become reusable IP, automation, knowledge, or
--            revenue, the reusable forms it should take, its eight-dimension
--            metrics, and its compounding score. Implements the Compounding
--            Engine (ADR-0084) on top of the tenant-scoped platform.
--
-- COMPOUNDING MODEL
--   - Each row is a COMPUTED evaluation of one completed task: the engine asks
--     whether the work can create value repeatedly and writes the conclusions
--     out as a dated evaluation.
--   - `recommended_forms` holds the reusable forms the task can become (sop,
--     template, automation, agent, workflow, ... licensing_opportunity);
--     `metrics` holds the eight compounding-score dimensions (each 0..1);
--     `compounding_score` (0..1) is the weighted compounding value.
--   - `recommend_create_reusable` is true when the score warrants creating the
--     reusable version now. `lineage_id` links to the Asset Lineage Graph row
--     (see asset_lineage) when one exists.
--   - Evaluations are APPEND-ONLY / IMMUTABLE: a row is a recorded computation,
--     not edited in place. There is no updated_at and no trigger — successive
--     evaluations append new rows rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0155_compounding_evaluations_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- compounding_evaluations — a computed compounding evaluation of one completed
-- task. Holds the recommended reusable forms, the eight-dimension metrics, the
-- compounding score, the create-reusable recommendation, and the lineage link.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists compounding_evaluations (
  id                         uuid              primary key default gen_random_uuid(),
  tenant_id                  uuid              not null,
  task_title                 text              not null,
  recommended_forms          jsonb             not null default '[]'::jsonb,
  metrics                    jsonb             not null default '{}'::jsonb,
  compounding_score          double precision  not null default 0 check (compounding_score >= 0 and compounding_score <= 1),
  recommend_create_reusable  boolean           not null default false,
  lineage_id                 uuid,
  created_at                 timestamptz       not null default now()
);

create index if not exists compounding_evaluations_tenant_created_idx
  on compounding_evaluations (tenant_id, created_at);

-- >>>>> 0155_compounding_evaluations_rls.sql >>>>>
-- =============================================================================
-- Migration: 0155_compounding_evaluations_rls.sql
-- Purpose:   Enable Row-Level Security on the Compounding Engine
--            `compounding_evaluations` table with a DENY-BY-DEFAULT posture,
--            then add tenant-isolation policies. Mirrors the tenancy model from
--            0002.
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
--   `compounding_evaluations` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing evaluation immutable — no caller can mutate or remove it.
--   This matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on compounding_evaluations (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table compounding_evaluations enable row level security;

-- =============================================================================
-- compounding_evaluations — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing evaluation immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy compounding_evaluations_select on compounding_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy compounding_evaluations_insert on compounding_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0156_asset_lineage.sql >>>>>
-- =============================================================================
-- Migration: 0156_asset_lineage.sql
-- Purpose:   Stand up the Alfy² Asset Lineage Graph — a single `asset_lineage`
--            table where every asset knows what created it, what it created, and
--            its footprint (businesses, agents, workflows using it, and revenue
--            it influenced). Backs the Compounding Engine's lineage graph
--            (ADR-0084) on top of the tenant-scoped platform.
--
-- ASSET LINEAGE MODEL
--   - Each row is a LINEAGE record for one asset (`asset_title`): what produced
--     it (`created_by`), what it created (`created_assets`), and its footprint
--     (`businesses_using`, `agents_using`, `workflows_using`,
--     `revenue_influenced_usd`).
--   - Lineage is MUTABLE: as an asset accrues uses and influence over time, the
--     record is updated in place and `version` is bumped on each material change.
--   - The contract exposes `last_updated` as the mutable timestamp. We reuse the
--     shared set_updated_at() trigger from 0001 (which writes new.updated_at), so
--     the table also carries an `updated_at` trigger target; the same trigger
--     mirrors that value into `last_updated` to keep the contract column
--     authoritative.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- RLS policies and the deny-by-default posture live in 0157_asset_lineage_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- asset_lineage — a lineage record for one asset: what created it, what it
-- created, the businesses/agents/workflows using it, and the revenue it
-- influenced. Mutable; version bumps on material changes. `last_updated` is the
-- contract-facing mutable timestamp; `updated_at` is the shared trigger target.
-- -----------------------------------------------------------------------------
create table if not exists asset_lineage (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  asset_title             text              not null,
  created_by              text              not null default '',
  created_assets          jsonb             not null default '[]'::jsonb,
  businesses_using        jsonb             not null default '[]'::jsonb,
  revenue_influenced_usd  double precision  not null default 0,
  agents_using            jsonb             not null default '[]'::jsonb,
  workflows_using         jsonb             not null default '[]'::jsonb,
  version                 integer           not null default 1 check (version > 0),
  created_at              timestamptz       not null default now(),
  last_updated            timestamptz       not null default now(),
  updated_at              timestamptz
);

create index if not exists asset_lineage_tenant_title_idx
  on asset_lineage (tenant_id, asset_title);

-- -----------------------------------------------------------------------------
-- Mutable-timestamp trigger for asset_lineage. Reuses the shared set_updated_at()
-- from 0001 (do NOT redefine it) to maintain `updated_at`, and a thin companion
-- trigger mirrors the same now() into the contract's `last_updated` column on
-- every UPDATE so the contract-facing timestamp stays authoritative.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_asset_lineage on asset_lineage;
create trigger set_updated_at_asset_lineage
  before update on asset_lineage
  for each row execute function set_updated_at();

create or replace function set_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

drop trigger if exists set_last_updated_asset_lineage on asset_lineage;
create trigger set_last_updated_asset_lineage
  before update on asset_lineage
  for each row execute function set_last_updated();

-- >>>>> 0157_asset_lineage_rls.sql >>>>>
-- =============================================================================
-- Migration: 0157_asset_lineage_rls.sql
-- Purpose:   Enable Row-Level Security on the Asset Lineage Graph
--            `asset_lineage` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on the asset_lineage table (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table asset_lineage enable row level security;

-- =============================================================================
-- asset_lineage — mutable: lineage records accrue uses and influence over time
-- and are updated in place (with version bumps). select/insert/update/delete,
-- all tenant-scoped.
-- =============================================================================
create policy asset_lineage_select on asset_lineage
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_lineage_insert on asset_lineage
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_lineage_update on asset_lineage
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy asset_lineage_delete on asset_lineage
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0158_multiplication_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0158_multiplication_evaluations.sql
-- Purpose:   Stand up the Alfy² Multiplication Engine — a single
--            `multiplication_evaluations` table that records, for each solved
--            problem, who/what the solution could help, the shared forms it
--            should be converted into, its estimated future uses, and its
--            multiplication score. Implements the Multiplication Engine
--            (ADR-0085) on top of the tenant-scoped platform.
--
-- MULTIPLICATION MODEL
--   - Each row is a COMPUTED evaluation of one solution: the engine asks whether
--     it can help another business, department, workflow, agent, future Alyssa,
--     future FounderOS users, clients, partners, or investors, and writes the
--     conclusions out as a dated evaluation.
--   - `helps` holds the targets the solution could plausibly help;
--     `recommended_shared_forms` holds the shared forms to convert it into
--     (shared_infrastructure ... founderos_feature); `estimated_future_uses`
--     (targets × uses-per-target) and `multiplication_score` (0..1) frame the
--     leverage; `recommend_share` is true when sharing is warranted.
--   - Evaluations are APPEND-ONLY / IMMUTABLE: a row is a recorded computation,
--     not edited in place. There is no updated_at and no trigger — successive
--     evaluations append new rows rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0159_multiplication_evaluations_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- multiplication_evaluations — a computed multiplication evaluation of one
-- solution. Holds who/what it helps, the recommended shared forms, the estimated
-- future uses, the multiplication score, and the share recommendation.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists multiplication_evaluations (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  solution_title            text              not null,
  helps                     jsonb             not null default '[]'::jsonb,
  recommended_shared_forms  jsonb             not null default '[]'::jsonb,
  estimated_future_uses     integer           not null default 0,
  multiplication_score      double precision  not null default 0 check (multiplication_score >= 0 and multiplication_score <= 1),
  recommend_share           boolean           not null default false,
  created_at                timestamptz       not null default now()
);

create index if not exists multiplication_evaluations_tenant_created_idx
  on multiplication_evaluations (tenant_id, created_at);

-- >>>>> 0159_multiplication_evaluations_rls.sql >>>>>
-- =============================================================================
-- Migration: 0159_multiplication_evaluations_rls.sql
-- Purpose:   Enable Row-Level Security on the Multiplication Engine
--            `multiplication_evaluations` table with a DENY-BY-DEFAULT posture,
--            then add tenant-isolation policies. Mirrors the tenancy model from
--            0002.
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
--   `multiplication_evaluations` gets INSERT + SELECT policies ONLY. The
--   deliberate ABSENCE of UPDATE and DELETE policies, combined with
--   deny-by-default, makes every existing evaluation immutable — no caller can
--   mutate or remove it. This matches the append-only posture of `events` and
--   `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on multiplication_evaluations (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table multiplication_evaluations enable row level security;

-- =============================================================================
-- multiplication_evaluations — APPEND-ONLY / IMMUTABLE. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing evaluation immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy multiplication_evaluations_select on multiplication_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy multiplication_evaluations_insert on multiplication_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0160_leverage_comparisons.sql >>>>>
-- =============================================================================
-- Migration: 0160_leverage_comparisons.sql
-- Purpose:   Stand up the Alfy² Leverage Engine — a single `leverage_comparisons`
--            table that stores each ranked comparison across options, the
--            recommended highest-leverage path, and a note explaining any
--            fastest-vs-highest-leverage trade-off. Implements the Leverage
--            Engine (ADR-0086) on top of the tenant-scoped platform.
--
-- LEVERAGE MODEL
--   - Each row is a COMPUTED ranked comparison across options: the engine scores
--     each option from its fourteen leverage inputs and writes the ranking out as
--     a dated comparison.
--   - `ranked` holds the per-option leverage scores (label, score, tier, top
--     drivers, why) in ranked order; `recommended_option` is the highest-leverage
--     path (not simply the fastest); `note` explains the trade when the fastest
--     option differs from the highest-leverage one.
--   - Comparisons are APPEND-ONLY / IMMUTABLE: a row is a recorded computation,
--     not edited in place. There is no updated_at and no trigger — successive
--     comparisons append new rows rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in 0161_leverage_comparisons_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- leverage_comparisons — a computed ranked comparison across options, with the
-- recommended highest-leverage option and a note on any fastest-vs-leverage
-- trade. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists leverage_comparisons (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  ranked              jsonb             not null default '[]'::jsonb,
  recommended_option  text              not null,
  note                text              not null default '',
  created_at          timestamptz       not null default now()
);

create index if not exists leverage_comparisons_tenant_created_idx
  on leverage_comparisons (tenant_id, created_at);

-- >>>>> 0161_leverage_comparisons_rls.sql >>>>>
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

-- >>>>> 0162_allocation_plans.sql >>>>>
-- =============================================================================
-- Migration: 0162_allocation_plans.sql
-- Purpose:   Stand up the Alfy² Executive Capital Allocator — a single
--            `allocation_plans` table that stores the engine's recommendation
--            for the highest-value allocation of the operator's limited capital
--            (time, money, energy, attention, relationships, reputation,
--            knowledge, technology, assets, employees, agents, automation
--            capacity) over a given horizon. Implements the Capital Allocator on
--            top of the tenant-scoped platform.
--
-- CAPITAL ALLOCATOR MODEL
--   - Each row is a COMPUTED POINT-IN-TIME RECOMMENDATION for one horizon: the
--     engine evaluates candidate uses of capital and writes the conclusions out
--     as a dated plan (`created_at`).
--   - The plan answers the operator's horizon question directly — morning
--     (daily) "what creates the highest return today?", weekly "where should we
--     invest next?", quarterly "what should we stop investing in?":
--       highest_roi, highest_leverage, highest_compounding,
--       highest_strategic_value, highest_founder_freedom.
--   - It NEVER optimizes one resource while destroying another: `tradeoffs`
--     surfaces what each top pick depletes, and `stop_investing_in` (quarterly)
--     names what to cut.
--   - Plans are APPEND-ONLY: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new plans rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0163_allocation_plans_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- allocation_plans — a computed point-in-time capital allocation recommendation
-- for one horizon. Names the highest-ROI / leverage / compounding / strategic /
-- founder-freedom pick, the recommendation, the trade-offs each top pick
-- depletes, and (quarterly) what to stop investing in. Append-only (no
-- updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists allocation_plans (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  horizon                  text              not null
                                             check (horizon in ('daily','weekly','quarterly')),
  question                 text              not null,
  highest_roi              text,
  highest_leverage         text,
  highest_compounding      text,
  highest_strategic_value  text,
  highest_founder_freedom  text,
  recommendation           text              not null,
  tradeoffs                jsonb             not null default '[]'::jsonb,
  stop_investing_in        jsonb             not null default '[]'::jsonb,
  created_at               timestamptz       not null default now()
);

create index if not exists allocation_plans_tenant_horizon_idx
  on allocation_plans (tenant_id, horizon);

-- >>>>> 0163_allocation_plans_rls.sql >>>>>
-- =============================================================================
-- Migration: 0163_allocation_plans_rls.sql
-- Purpose:   Enable Row-Level Security on the Capital Allocator
--            `allocation_plans` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- POINT-IN-TIME / APPEND-ONLY
--   `allocation_plans` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing plan immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on allocation_plans (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table allocation_plans enable row level security;

-- =============================================================================
-- allocation_plans — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing plan immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy allocation_plans_select on allocation_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy allocation_plans_insert on allocation_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0164_opportunity_comparisons.sql >>>>>
-- =============================================================================
-- Migration: 0164_opportunity_comparisons.sql
-- Purpose:   Stand up the Alfy² Opportunity Cost Engine — a single
--            `opportunity_comparisons` table that stores the engine's comparison
--            of options A/B/C/D, computing for each the expected value and
--            opportunity cost, then recommending the best financial / strategic /
--            long-term / low-risk / fastest / highest-leverage choice while always
--            showing what is NOT being chosen and why. Implements the Opportunity
--            Cost Engine on top of the tenant-scoped platform.
--
-- OPPORTUNITY COST MODEL
--   - Each row is a COMPUTED POINT-IN-TIME COMPARISON for one question: the
--     engine evaluates the options and writes the conclusions out as a dated
--     comparison (`created_at`).
--   - `evaluated` holds each option with its computed expected value,
--     opportunity cost (value forgone vs the best alternative), and composite
--     score.
--   - The comparison answers the operator's choice directly:
--       best_financial, best_strategic, best_long_term, best_low_risk, fastest,
--       highest_leverage.
--   - `not_chosen` records what is NOT being chosen, and why.
--   - Comparisons are APPEND-ONLY: a row is a recorded computation, not edited in
--     place. There is no updated_at and no trigger — successive computations
--     append new comparisons rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0165_opportunity_comparisons_rls.sql. This file only defines structure; it
-- does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- opportunity_comparisons — a computed point-in-time comparison of options for
-- one question. Holds each evaluated option with its expected value and
-- opportunity cost, names the best financial / strategic / long-term / low-risk /
-- fastest / highest-leverage pick, records what is NOT being chosen, and gives a
-- recommendation. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists opportunity_comparisons (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  question          text              not null default '',
  evaluated         jsonb             not null default '[]'::jsonb,
  best_financial    text              not null,
  best_strategic    text              not null,
  best_long_term    text              not null,
  best_low_risk     text              not null,
  fastest           text              not null,
  highest_leverage  text              not null,
  not_chosen        jsonb             not null default '[]'::jsonb,
  recommendation    text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists opportunity_comparisons_tenant_created_idx
  on opportunity_comparisons (tenant_id, created_at);

-- >>>>> 0165_opportunity_comparisons_rls.sql >>>>>
-- =============================================================================
-- Migration: 0165_opportunity_comparisons_rls.sql
-- Purpose:   Enable Row-Level Security on the Opportunity Cost Engine
--            `opportunity_comparisons` table with a DENY-BY-DEFAULT posture, then
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
-- POINT-IN-TIME / APPEND-ONLY
--   `opportunity_comparisons` gets INSERT + SELECT policies ONLY. The deliberate
--   ABSENCE of UPDATE and DELETE policies, combined with deny-by-default, makes
--   every existing comparison immutable — no caller can mutate or remove it. This
--   matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on opportunity_comparisons (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table opportunity_comparisons enable row level security;

-- =============================================================================
-- opportunity_comparisons — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing comparison immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy opportunity_comparisons_select on opportunity_comparisons
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy opportunity_comparisons_insert on opportunity_comparisons
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0166_journaled_decisions.sql >>>>>
-- =============================================================================
-- Migration: 0166_journaled_decisions.sql
-- Purpose:   Stand up the Alfy² Executive Decision Journal — a single
--            `journaled_decisions` table that records every major decision (the
--            decision, alternatives, reasoning, data available, assumptions,
--            risks, expected outcome) and schedules reviews at 30, 90, and 365
--            days to record the actual outcome and lessons learned, improving
--            future recommendations and surfacing recurring decision patterns.
--            Implements the Decision Journal on top of the tenant-scoped
--            platform.
--
-- DECISION JOURNAL MODEL
--   - Each row is a journaled decision: what was decided, the alternatives
--     considered, the reasoning, the data available, the assumptions, the risks,
--     and the expected outcome at the time the decision was made (`decided_at`).
--   - `reviews_due` maps each review window (30_day / 90_day / 1_year) to its due
--     date; `reviewed_windows` records which windows have been reviewed.
--   - At review time the row is UPDATED in place to fill in `actual_outcome` and
--     `lessons_learned` — so the table is MUTABLE: it carries updated_at and the
--     shared set_updated_at() trigger from 0001.
--   - `category` is a tag for pattern detection (e.g. "hiring", "pricing").
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0167_journaled_decisions_rls.sql. This file only defines structure; it does
-- NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- journaled_decisions — a recorded major decision with its alternatives,
-- reasoning, data, assumptions, risks, and expected outcome, plus a review
-- schedule (reviews_due) and the windows already reviewed. Updated in place at
-- review time to capture actual_outcome and lessons_learned. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists journaled_decisions (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  decision          text              not null,
  alternatives      jsonb             not null default '[]'::jsonb,
  reasoning         text              not null default '',
  data_available    jsonb             not null default '[]'::jsonb,
  assumptions       jsonb             not null default '[]'::jsonb,
  risks             jsonb             not null default '[]'::jsonb,
  expected_outcome  text              not null default '',
  category          text              not null default '',
  business_id       uuid,
  actual_outcome    text              not null default '',
  lessons_learned   jsonb             not null default '[]'::jsonb,
  reviews_due       jsonb             not null default '{}'::jsonb,
  reviewed_windows  jsonb             not null default '[]'::jsonb,
  decided_at        timestamptz       not null default now(),
  created_at        timestamptz       not null default now(),
  updated_at        timestamptz
);

create index if not exists journaled_decisions_tenant_category_idx
  on journaled_decisions (tenant_id, category);

-- -----------------------------------------------------------------------------
-- updated_at trigger for journaled_decisions. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_journaled_decisions on journaled_decisions;
create trigger set_updated_at_journaled_decisions
  before update on journaled_decisions
  for each row execute function set_updated_at();

-- >>>>> 0167_journaled_decisions_rls.sql >>>>>
-- =============================================================================
-- Migration: 0167_journaled_decisions_rls.sql
-- Purpose:   Enable Row-Level Security on the Decision Journal
--            `journaled_decisions` table with a DENY-BY-DEFAULT posture, then add
--            tenant-isolation policies. Mirrors the tenancy model from 0002.
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
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on journaled_decisions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table journaled_decisions enable row level security;

-- =============================================================================
-- journaled_decisions — mutable: a decision is recorded, then updated in place
-- at review time to capture the actual outcome and lessons learned.
-- select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy journaled_decisions_select on journaled_decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy journaled_decisions_insert on journaled_decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy journaled_decisions_update on journaled_decisions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy journaled_decisions_delete on journaled_decisions
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0168_timeline_events.sql >>>>>
-- =============================================================================
-- Migration: 0168_timeline_events.sql
-- Purpose:   Stand up the Alfy² Enterprise Memory Timeline — a single
--            `timeline_events` table holding a chronological history of business
--            launches, campaigns, product releases, major decisions, clients,
--            partnerships, financial milestones, failures, wins, hiring,
--            technology adoption, legal events, and media appearances — each
--            event linking related assets, agents, people, businesses, and
--            lessons. Implements the Memory Timeline on top of the tenant-scoped
--            platform.
--
-- MEMORY TIMELINE MODEL
--   - Each row is a recorded historical EVENT of one of 13 kinds, stamped with
--     when it actually happened (`occurred_at`) so the timeline can answer "when
--     did we first discuss this?" and "what happened after that decision?".
--   - Each event links the related assets, agents, people, and businesses, and
--     the lessons learned.
--   - Events are APPEND-ONLY: a row is a recorded historical fact, not edited in
--     place. There is no updated_at and no trigger — new history is appended
--     rather than mutating old events.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is append-only history, so it
--     has none and gets no set_updated_at() trigger.
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0169_timeline_events_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- timeline_events — a single chronological event in the enterprise history, of
-- one of 13 kinds, stamped with when it occurred, linking related assets,
-- agents, people, businesses, and lessons learned. Append-only (no updated_at,
-- no trigger).
-- -----------------------------------------------------------------------------
create table if not exists timeline_events (
  id                   uuid              primary key default gen_random_uuid(),
  tenant_id            uuid              not null,
  kind                 text              not null
                                         check (kind in (
                                           'business_launch','campaign','product_release',
                                           'major_decision','client','partnership',
                                           'financial_milestone','failure','win','hiring',
                                           'technology_adoption','legal_event','media_appearance')),
  title                text              not null,
  occurred_at          timestamptz       not null,
  summary              text              not null default '',
  business_id          uuid,
  related_assets       jsonb             not null default '[]'::jsonb,
  related_agents       jsonb             not null default '[]'::jsonb,
  related_people       jsonb             not null default '[]'::jsonb,
  related_businesses   jsonb             not null default '[]'::jsonb,
  lessons_learned      jsonb             not null default '[]'::jsonb,
  created_at           timestamptz       not null default now()
);

create index if not exists timeline_events_tenant_occurred_idx
  on timeline_events (tenant_id, occurred_at);

create index if not exists timeline_events_tenant_kind_idx
  on timeline_events (tenant_id, kind);

-- >>>>> 0169_timeline_events_rls.sql >>>>>
-- =============================================================================
-- Migration: 0169_timeline_events_rls.sql
-- Purpose:   Enable Row-Level Security on the Memory Timeline `timeline_events`
--            table with a DENY-BY-DEFAULT posture, then add tenant-isolation
--            policies. Mirrors the tenancy model from 0002.
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
-- APPEND-ONLY HISTORY
--   `timeline_events` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing event immutable — no caller can mutate or remove recorded history.
--   This matches the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on timeline_events (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table timeline_events enable row level security;

-- =============================================================================
-- timeline_events — APPEND-ONLY HISTORY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing event immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy timeline_events_select on timeline_events
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy timeline_events_insert on timeline_events
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0170_board_reviews.sql >>>>>
-- =============================================================================
-- Migration: 0170_board_reviews.sql
-- Purpose:   Stand up the Alfy² Executive Review Board — a single `board_reviews`
--            table that stores the result of convening a virtual board before a
--            major strategic recommendation. Each reviewer (CEO, CFO, COO, CTO,
--            CMO, CLO, CRO, CSO, CPO, CCO) independently evaluates benefits,
--            risks, blind spots, dependencies, costs, and operational impact; the
--            board then synthesizes a final recommendation and HIGHLIGHTS
--            disagreements rather than forcing consensus. Implements the Review
--            Board on top of the tenant-scoped platform.
--
-- REVIEW BOARD MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REVIEW for one proposal: the board
--     convenes, each reviewer renders an independent verdict, and the result is
--     written out as a dated review (`created_at`).
--   - `verdicts` holds the per-reviewer verdicts (stance, benefits, risks, blind
--     spots, dependencies, costs, operational impact); `approvals` and
--     `rejections` tally the stances.
--   - `disagreements` are highlighted, not smoothed over; `synthesis` and
--     `final_recommendation` are the board's combined output.
--   - Reviews are APPEND-ONLY: a row is a recorded deliberation, not edited in
--     place. There is no updated_at and no trigger — successive convenings append
--     new reviews rather than mutating old ones.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- RLS policies and the deny-by-default posture live in
-- 0171_board_reviews_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- board_reviews — a computed point-in-time board review for one proposal. Holds
-- the per-reviewer verdicts, the approval/rejection tallies, the highlighted
-- disagreements, and the board's synthesis and final recommendation. Append-only
-- (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists board_reviews (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  proposal              text              not null,
  verdicts              jsonb             not null default '[]'::jsonb,
  approvals             integer           not null default 0 check (approvals >= 0),
  rejections            integer           not null default 0 check (rejections >= 0),
  disagreements         jsonb             not null default '[]'::jsonb,
  synthesis             text              not null,
  final_recommendation  text              not null,
  created_at            timestamptz       not null default now()
);

create index if not exists board_reviews_tenant_created_idx
  on board_reviews (tenant_id, created_at);

-- >>>>> 0171_board_reviews_rls.sql >>>>>
-- =============================================================================
-- Migration: 0171_board_reviews_rls.sql
-- Purpose:   Enable Row-Level Security on the Review Board `board_reviews` table
--            with a DENY-BY-DEFAULT posture, then add tenant-isolation policies.
--            Mirrors the tenancy model from 0002.
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
-- POINT-IN-TIME / APPEND-ONLY
--   `board_reviews` gets INSERT + SELECT policies ONLY. The deliberate ABSENCE
--   of UPDATE and DELETE policies, combined with deny-by-default, makes every
--   existing review immutable — no caller can mutate or remove it. This matches
--   the append-only posture of `events` and `audit_log` in 0002.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS on board_reviews (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table board_reviews enable row level security;

-- =============================================================================
-- board_reviews — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes
-- every existing review immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy board_reviews_select on board_reviews
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy board_reviews_insert on board_reviews
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0172_offload_records.sql >>>>>
-- =============================================================================
-- Migration: 0172_offload_records.sql
-- Purpose:   Stand up the Cognitive Offloading Engine (COE) — a single
--            `offload_records` table that stores the result of running an input
--            through the five-stage L0 pipeline (Understand → Connect → Build →
--            Delegate → Executive Report). Each row records the extracted
--            understanding, the connections/built items, what was handled, and the
--            Stage-5 executive report plus the share of cognitive load removed.
--            Implements ADR-0093-cognitive-offload on the tenant-scoped platform.
--
-- OFFLOAD RECORD MODEL
--   - Each row is a COMPUTED POINT-IN-TIME RECORD for one processed input: the
--     pipeline runs and the result is written out as a dated record
--     (`created_at`).
--   - `understanding` is the Stage-1 extraction; `connections` and `built` are the
--     Connect/Build outputs; `handled` is the per-item delegation disposition.
--   - The Stage-5 executive report (`what_changed`, `why_it_matters`,
--     `completed_automatically`, `decisions_requiring_alyssa`) surfaces only what
--     needs executive attention; `cognitive_load_removed` is the 0..1 share taken
--     off Alyssa's plate.
--   - Records are APPEND-ONLY: a row is a recorded run, not edited in place. There
--     is no updated_at and no trigger — successive runs append new records.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every record immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- offload_records — a computed point-in-time COE record for one processed input.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists offload_records (
  id                          uuid              primary key default gen_random_uuid(),
  tenant_id                   uuid              not null,
  kind                        text              not null check (kind in (
                                                  'conversation', 'voice_note', 'meeting_transcript',
                                                  'email', 'pdf', 'image', 'message', 'uploaded_file')),
  understanding               jsonb             not null default '{}'::jsonb,
  connections                 jsonb             not null default '[]'::jsonb,
  built                       jsonb             not null default '[]'::jsonb,
  handled                     jsonb             not null default '[]'::jsonb,
  what_changed                text              not null default '',
  why_it_matters              text              not null default '',
  completed_automatically     jsonb             not null default '[]'::jsonb,
  decisions_requiring_alyssa  jsonb             not null default '[]'::jsonb,
  cognitive_load_removed      numeric           not null check (cognitive_load_removed >= 0 and cognitive_load_removed <= 1),
  created_at                  timestamptz       not null default now()
);

create index if not exists offload_records_tenant_created_idx
  on offload_records (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on offload_records (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table offload_records enable row level security;

-- =============================================================================
-- offload_records — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing record immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy offload_records_select on offload_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy offload_records_insert on offload_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0173_logistics_plans.sql >>>>>
-- =============================================================================
-- Migration: 0173_logistics_plans.sql
-- Purpose:   Stand up the Life Logistics Engine — a single `logistics_plans`
--            table that stores the auto-generated preparation for a detected
--            future event: checklists, calendar blocks, reminders, and follow-ups,
--            so Alyssa never has to remember it. Implements
--            ADR-0094-life-logistics on the tenant-scoped platform.
--
-- LOGISTICS PLAN MODEL
--   - Each row is a COMPUTED POINT-IN-TIME PLAN for one event: the engine detects
--     the event and writes out the generated prep as a dated plan (`created_at`).
--   - `checklists`, `calendar_blocks`, and `reminders` hold the structured prep;
--     `follow_ups` are the after-event actions.
--   - Plans are APPEND-ONLY: a row is a generated plan, not edited in place. There
--     is no updated_at and no trigger — re-running detection appends a new plan.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every plan immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- logistics_plans — a computed point-in-time logistics plan for one event.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists logistics_plans (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  event             text              not null,
  starts_at         timestamptz       not null,
  checklists        jsonb             not null default '[]'::jsonb,
  calendar_blocks   jsonb             not null default '[]'::jsonb,
  reminders         jsonb             not null default '[]'::jsonb,
  follow_ups        jsonb             not null default '[]'::jsonb,
  created_at        timestamptz       not null default now()
);

create index if not exists logistics_plans_tenant_created_idx
  on logistics_plans (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on logistics_plans (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table logistics_plans enable row level security;

-- =============================================================================
-- logistics_plans — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing plan immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy logistics_plans_select on logistics_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy logistics_plans_insert on logistics_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0174_antifragility_cases.sql >>>>>
-- =============================================================================
-- Migration: 0174_antifragility_cases.sql
-- Purpose:   Stand up the Anti-Fragility Engine — a single `antifragility_cases`
--            table that stores the anti-fragile response to a failure: root
--            cause, whether it was preventable, the reusable lesson, and the new
--            safeguard / automation / agent / SOP / system redesign it implies,
--            plus recovery speed, learning gained, and future risk reduction.
--            Implements ADR-0095-anti-fragility on the tenant-scoped platform.
--
-- ANTI-FRAGILITY CASE MODEL
--   - Each row is a COMPUTED POINT-IN-TIME CASE for one failure: the engine
--     analyzes it and writes out the response as a dated case (`created_at`).
--   - `recovery_days` is the time from failure to recovery; `learning_gained` and
--     `future_risk_reduction` are 0..1 scores.
--   - Cases are APPEND-ONLY: a row is a recorded analysis, not edited in place.
--     There is no updated_at and no trigger — re-analysis appends a new case.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every case immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- antifragility_cases — a computed point-in-time anti-fragile response to one
-- failure. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists antifragility_cases (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  type                    text              not null check (type in (
                                              'missed_opportunity', 'failed_launch', 'security_incident',
                                              'rejected_proposal', 'lost_sale', 'customer_complaint',
                                              'agent_failure', 'workflow_breakdown', 'model_error')),
  title                   text              not null,
  root_cause              text              not null default '',
  preventable             boolean           not null,
  reusable_lesson         text              not null default '',
  new_safeguard           text              not null default '',
  new_automation          text              not null default '',
  new_agent               text              not null default '',
  new_sop                 text              not null default '',
  system_redesign         text              not null default '',
  recovery_days           integer           not null check (recovery_days >= 0),
  learning_gained         numeric           not null check (learning_gained >= 0 and learning_gained <= 1),
  future_risk_reduction   numeric           not null check (future_risk_reduction >= 0 and future_risk_reduction <= 1),
  created_at              timestamptz       not null default now()
);

create index if not exists antifragility_cases_tenant_created_idx
  on antifragility_cases (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on antifragility_cases (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table antifragility_cases enable row level security;

-- =============================================================================
-- antifragility_cases — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing case immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy antifragility_cases_select on antifragility_cases
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy antifragility_cases_insert on antifragility_cases
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0175_council_verdicts.sql >>>>>
-- =============================================================================
-- Migration: 0175_council_verdicts.sql
-- Purpose:   Stand up the Confidence-Weighted Agent Council — a single
--            `council_verdicts` table that stores the orchestrator's synthesis of
--            a ten-agent council: each agent's independent, confidence-scored
--            opinion, the mean agreement, the confidence gap, the unresolved
--            risks, whether more data is needed, and the final recommendation.
--            Implements ADR-0097-agent-council on the tenant-scoped platform.
--
-- COUNCIL VERDICT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME VERDICT for one decision: the council
--     convenes and the synthesis is written out as a dated verdict (`created_at`).
--   - `opinions` holds the per-agent evaluations; `agreement` (mean confidence)
--     and `confidence_gap` (spread) are 0..1; `needs_more_data` flags when the
--     council lacks enough data to decide.
--   - Verdicts are APPEND-ONLY: a row is a recorded deliberation, not edited in
--     place. There is no updated_at and no trigger — successive convenings append.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every verdict immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- council_verdicts — a computed point-in-time orchestrator synthesis for one
-- decision. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists council_verdicts (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  kind              text              not null check (kind in (
                                        'entity_restructuring', 'large_spending', 'major_launch',
                                        'pricing_change', 'fundraising', 'hiring',
                                        'legal_compliance', 'market_entry')),
  decision          text              not null,
  opinions          jsonb             not null default '[]'::jsonb,
  agreement         numeric           not null check (agreement >= 0 and agreement <= 1),
  confidence_gap    numeric           not null check (confidence_gap >= 0 and confidence_gap <= 1),
  unresolved_risks  jsonb             not null default '[]'::jsonb,
  needs_more_data   boolean           not null,
  recommendation    text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists council_verdicts_tenant_created_idx
  on council_verdicts (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on council_verdicts (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table council_verdicts enable row level security;

-- =============================================================================
-- council_verdicts — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing verdict immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy council_verdicts_select on council_verdicts
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy council_verdicts_insert on council_verdicts
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0176_capital_board_decisions.sql >>>>>
-- =============================================================================
-- Migration: 0176_capital_board_decisions.sql
-- Purpose:   Stand up the Capital Allocation Board — a single
--            `capital_board_decisions` table that stores the board's allocation
--            of cash, time, attention, energy, team/agent capacity, technology
--            spend, relationships, and brand equity: for every option it records
--            the scored verdict and disposition (invest / test / delay / automate
--            / delegate / kill / sell / package_founderos) and names the top pick.
--            Implements ADR-0099-capital-board on the tenant-scoped platform.
--
-- CAPITAL BOARD DECISION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME DECISION for one allocation run: the
--     board scores the options and writes out the result as a dated decision
--     (`created_at`).
--   - `verdicts` holds the per-option scores, opportunity cost, disposition, and
--     reason; `top_pick` is the recommended option label.
--   - Decisions are APPEND-ONLY: a row is a recorded allocation, not edited in
--     place. There is no updated_at and no trigger — re-running appends a new row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every decision immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- capital_board_decisions — a computed point-in-time allocation decision.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists capital_board_decisions (
  id            uuid              primary key default gen_random_uuid(),
  tenant_id     uuid              not null,
  verdicts      jsonb             not null default '[]'::jsonb,
  top_pick      text              not null,
  created_at    timestamptz       not null default now()
);

create index if not exists capital_board_decisions_tenant_created_idx
  on capital_board_decisions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on capital_board_decisions (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table capital_board_decisions enable row level security;

-- =============================================================================
-- capital_board_decisions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing decision immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy capital_board_decisions_select on capital_board_decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy capital_board_decisions_insert on capital_board_decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0177_sprint_plans.sql >>>>>
-- =============================================================================
-- Migration: 0177_sprint_plans.sql
-- Purpose:   Stand up the Million-Dollar Sprint Engine — a single `sprint_plans`
--            table that stores an aggressive-but-realistic path to a cash target:
--            ranked cash paths with their expected cash, the 7/30/90-day plans,
--            the daily money actions, and whether the probability-weighted total
--            is realistic (no fantasy math). Implements ADR-0100-million-sprint on
--            the tenant-scoped platform.
--
-- SPRINT PLAN MODEL
--   - Each row is a COMPUTED POINT-IN-TIME PLAN for one sprint: the engine ranks
--     the paths and writes out the plan as a dated record (`created_at`).
--   - `ranked_paths` holds each path's expected cash, velocity, score,
--     assumptions, risks, and required actions; `plan_7_day` / `plan_30_day` /
--     `plan_90_day` and `daily_money_actions` are the action lists; `realistic`
--     flags when the probability-weighted total clears the target.
--   - Plans are APPEND-ONLY: a row is a recorded plan, not edited in place. There
--     is no updated_at and no trigger — re-running appends a new plan.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every plan immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sprint_plans — a computed point-in-time sprint plan toward a cash target.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists sprint_plans (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  target_usd                numeric           not null check (target_usd > 0),
  ranked_paths              jsonb             not null default '[]'::jsonb,
  expected_total_cash_usd   numeric           not null check (expected_total_cash_usd >= 0),
  plan_7_day                jsonb             not null default '[]'::jsonb,
  plan_30_day               jsonb             not null default '[]'::jsonb,
  plan_90_day               jsonb             not null default '[]'::jsonb,
  daily_money_actions       jsonb             not null default '[]'::jsonb,
  realistic                 boolean           not null,
  created_at                timestamptz       not null default now()
);

create index if not exists sprint_plans_tenant_created_idx
  on sprint_plans (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on sprint_plans (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table sprint_plans enable row level security;

-- =============================================================================
-- sprint_plans — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing plan immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy sprint_plans_select on sprint_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy sprint_plans_insert on sprint_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0178_revenue_truth_reports.sql >>>>>
-- =============================================================================
-- Migration: 0178_revenue_truth_reports.sql
-- Purpose:   Stand up the Revenue Truth System — a single `revenue_truth_reports`
--            table that stores an honest, real-money-first revenue snapshot for a
--            business: cash collected, signed, invoices sent, qualified pipeline,
--            booked calls, the probability-weighted pipeline, the stalled deals,
--            and the single next money action. Prevents fake progress by never
--            treating activity as revenue. Implements ADR-0101-revenue-truth on
--            the tenant-scoped platform.
--
-- REVENUE TRUTH REPORT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REPORT for one business: the system
--     rolls up the deals and writes out the truth report as a dated record
--     (`created_at`).
--   - The *_usd fields are real-money-first rungs of the ladder; `booked_calls`
--     is an integer; `stalled_deals` lists deals idle past the threshold;
--     `next_money_action` is the single highest-leverage next step.
--   - Reports are APPEND-ONLY: a row is a recorded snapshot, not edited in place.
--     There is no updated_at and no trigger — re-running appends a new report.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every report immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- revenue_truth_reports — a computed point-in-time, real-money-first revenue
-- report for one business. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists revenue_truth_reports (
  id                                    uuid              primary key default gen_random_uuid(),
  tenant_id                             uuid              not null,
  business_name                         text              not null,
  cash_collected_usd                    numeric           not null check (cash_collected_usd >= 0),
  signed_usd                            numeric           not null check (signed_usd >= 0),
  invoices_sent_usd                     numeric           not null check (invoices_sent_usd >= 0),
  qualified_pipeline_usd                numeric           not null check (qualified_pipeline_usd >= 0),
  booked_calls                          integer           not null check (booked_calls >= 0),
  probability_weighted_pipeline_usd     numeric           not null check (probability_weighted_pipeline_usd >= 0),
  stalled_deals                         jsonb             not null default '[]'::jsonb,
  next_money_action                     text              not null,
  created_at                            timestamptz       not null default now()
);

create index if not exists revenue_truth_reports_tenant_created_idx
  on revenue_truth_reports (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on revenue_truth_reports (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table revenue_truth_reports enable row level security;

-- =============================================================================
-- revenue_truth_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy revenue_truth_reports_select on revenue_truth_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy revenue_truth_reports_insert on revenue_truth_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0179_delegation_decisions.sql >>>>>
-- =============================================================================
-- Migration: 0179_delegation_decisions.sql
-- Purpose:   Stand up the Executive Delegation System — a single
--            `delegation_decisions` table that stores, for each task, the owner it
--            should be routed to (alyssa_only / ai_agent / human_contractor /
--            specialist / attorney_cpa / assistant / automation / defer / delete),
--            the reason, and the founder hours returned by offloading it. Keeps
--            Alyssa focused on vision, relationships, high-value sales, strategic
--            decisions, creative insight, and approvals. Implements
--            ADR-0102-delegation on the tenant-scoped platform.
--
-- DELEGATION DECISION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME DECISION for one task: the system
--     classifies it and writes out the decision as a dated record (`created_at`).
--   - `owner` is the routing target; `hours_returned` is the founder time freed.
--   - Decisions are APPEND-ONLY: a row is a recorded classification, not edited in
--     place. There is no updated_at and no trigger — re-classifying appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every decision immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- delegation_decisions — a computed point-in-time delegation decision for one
-- task. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists delegation_decisions (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  task              text              not null,
  owner             text              not null check (owner in (
                                        'alyssa_only', 'ai_agent', 'human_contractor', 'specialist',
                                        'attorney_cpa', 'assistant', 'automation', 'defer', 'delete')),
  reason            text              not null,
  hours_returned    numeric           not null check (hours_returned >= 0),
  created_at        timestamptz       not null default now()
);

create index if not exists delegation_decisions_tenant_created_idx
  on delegation_decisions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on delegation_decisions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table delegation_decisions enable row level security;

-- =============================================================================
-- delegation_decisions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing decision immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy delegation_decisions_select on delegation_decisions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy delegation_decisions_insert on delegation_decisions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0180_risk_register.sql >>>>>
-- =============================================================================
-- Migration: 0180_risk_register.sql
-- Purpose:   Stand up the Enterprise Risk Register — a single `risk_register`
--            table that tracks risks across thirteen categories with severity,
--            likelihood, exposure, owner, mitigation, deadline, status, escalation
--            trigger, and affected businesses, surfacing the top ten weekly.
--            Implements ADR-0103-risk-register on the tenant-scoped platform.
--
-- RISK REGISTER MODEL
--   - Each row is a tracked enterprise risk: category, severity, likelihood, the
--     derived exposure (severity × likelihood, used for the top-10 ranking),
--     owner, mitigation, deadline, escalation trigger, and affected businesses.
--   - A risk's `status` moves through open → mitigating → monitored → closed and
--     its mitigation/owner/deadline are UPDATED in place as it is worked — so the
--     table is MUTABLE: it carries updated_at and the shared set_updated_at()
--     trigger from 0001 (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then full CRUD policies scope
--   rows to the current tenant via current_setting('app.tenant_id', true).
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- risk_register — a tracked enterprise risk, updated in place as it is mitigated
-- and its status advances. Mutable (carries updated_at + set_updated_at trigger).
-- -----------------------------------------------------------------------------
create table if not exists risk_register (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  category              text              not null check (category in (
                                            'legal', 'tax', 'security', 'financial', 'operational',
                                            'reputational', 'compliance', 'health_energy', 'relationship',
                                            'technology', 'vendor', 'customer', 'data_privacy')),
  title                 text              not null,
  severity              numeric           not null check (severity >= 0 and severity <= 1),
  likelihood            numeric           not null check (likelihood >= 0 and likelihood <= 1),
  exposure              numeric           not null check (exposure >= 0 and exposure <= 1),
  owner                 text              not null default '',
  mitigation            text              not null default '',
  deadline              timestamptz,
  escalation_trigger    text              not null default '',
  affected_businesses   jsonb             not null default '[]'::jsonb,
  status                text              not null default 'open' check (status in (
                                            'open', 'mitigating', 'monitored', 'closed')),
  created_at            timestamptz       not null default now(),
  updated_at            timestamptz
);

create index if not exists risk_register_tenant_exposure_idx
  on risk_register (tenant_id, exposure);

-- -----------------------------------------------------------------------------
-- updated_at trigger for risk_register. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_risk_register on risk_register;
create trigger set_updated_at_risk_register
  before update on risk_register
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Enable RLS on risk_register (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table risk_register enable row level security;

-- =============================================================================
-- risk_register — mutable: a risk is recorded, then updated in place as it is
-- mitigated and its status advances. select/insert/update/delete, all
-- tenant-scoped.
-- =============================================================================
create policy risk_register_select on risk_register
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy risk_register_insert on risk_register
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy risk_register_update on risk_register
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy risk_register_delete on risk_register
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0181_board_packets.sql >>>>>
-- =============================================================================
-- Migration: 0181_board_packets.sql
-- Purpose:   Stand up the Board Packet Generator — a single `board_packets` table
--            that stores board-level monthly reporting (executive summary, the
--            structured sections, and the next 30/60/90 actions) so Alyssa
--            operates like the CEO of a serious company before it is large.
--            Implements ADR-0104-board-packet on the tenant-scoped platform.
--
-- BOARD PACKET MODEL
--   - Each row is a COMPUTED POINT-IN-TIME PACKET for one period: the generator
--     assembles the report and writes it out as a dated packet (`created_at`).
--   - `executive_summary` is the headline; `sections` holds the per-heading item
--     lists; `next_30_60_90` is the forward action list.
--   - Packets are APPEND-ONLY: a row is a recorded monthly report, not edited in
--     place. There is no updated_at and no trigger — each period appends a packet.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every packet immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- board_packets — a computed point-in-time monthly board packet for one period.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists board_packets (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  period_label        text              not null,
  executive_summary   text              not null,
  sections            jsonb             not null default '[]'::jsonb,
  next_30_60_90       jsonb             not null default '[]'::jsonb,
  created_at          timestamptz       not null default now()
);

create index if not exists board_packets_tenant_created_idx
  on board_packets (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on board_packets (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table board_packets enable row level security;

-- =============================================================================
-- board_packets — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing packet immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy board_packets_select on board_packets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy board_packets_insert on board_packets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0182_exit_assessments.sql >>>>>
-- =============================================================================
-- Migration: 0182_exit_assessments.sql
-- Purpose:   Stand up the Strategic Exit & Asset Value Engine — a single
--            `exit_assessments` table that stores, for an asset, the recommended
--            exit paths, potential buyers, valuation logic, revenue multiple,
--            estimated value, strategic value, what proof/documentation is
--            missing, the steps to make it sellable, and how ready it is to sell
--            today. Implements ADR-0105-strategic-exit on the tenant-scoped
--            platform.
--
-- EXIT ASSESSMENT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME ASSESSMENT for one asset: the engine
--     scores it and writes out the assessment as a dated record (`created_at`).
--   - `recommended_paths` are the exit-path options; `potential_buyers`,
--     `missing_proof`, `missing_documentation`, and `steps_to_sellable` are lists;
--     `revenue_multiple` / `estimated_value_usd` / `strategic_value` /
--     `sellability` are numeric.
--   - Assessments are APPEND-ONLY: a row is a recorded valuation, not edited in
--     place. There is no updated_at and no trigger — re-assessing appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every assessment immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- exit_assessments — a computed point-in-time exit/value assessment for one
-- asset. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists exit_assessments (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  asset_name              text              not null,
  recommended_paths       jsonb             not null default '[]'::jsonb,
  potential_buyers        jsonb             not null default '[]'::jsonb,
  valuation_logic         text              not null,
  revenue_multiple        numeric           not null check (revenue_multiple >= 0),
  estimated_value_usd     numeric           not null check (estimated_value_usd >= 0),
  strategic_value         numeric           not null check (strategic_value >= 0 and strategic_value <= 1),
  missing_proof           jsonb             not null default '[]'::jsonb,
  missing_documentation   jsonb             not null default '[]'::jsonb,
  steps_to_sellable       jsonb             not null default '[]'::jsonb,
  sellability             numeric           not null check (sellability >= 0 and sellability <= 1),
  created_at              timestamptz       not null default now()
);

create index if not exists exit_assessments_tenant_created_idx
  on exit_assessments (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on exit_assessments (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table exit_assessments enable row level security;

-- =============================================================================
-- exit_assessments — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing assessment immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy exit_assessments_select on exit_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy exit_assessments_insert on exit_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0183_nervous_system_reports.sql >>>>>
-- =============================================================================
-- Migration: 0183_nervous_system_reports.sql
-- Purpose:   Stand up Founder Nervous System Protection — a single
--            `nervous_system_reports` table that stores a load reading: the
--            overall load index, the status (ok / elevated / high / critical), the
--            delegate/delay/batch/automate/cancel/simplify/escalate/convert
--            recommendations, and whether burnout risk is flagged as an enterprise
--            risk. Implements ADR-0106-nervous-system on the tenant-scoped
--            platform.
--
-- NERVOUS SYSTEM REPORT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME READING: the engine evaluates load and
--     writes out the report as a dated record (`created_at`).
--   - `load_index` is the 0..1 overall load; `status` is the band;
--     `recommendations` holds the per-target actions; `burnout_risk_flagged` is
--     true when load is high enough to register as an enterprise risk.
--   - Reports are APPEND-ONLY: a row is a recorded reading, not edited in place.
--     There is no updated_at and no trigger — each reading appends a report.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every report immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- nervous_system_reports — a computed point-in-time nervous-system reading.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists nervous_system_reports (
  id                    uuid              primary key default gen_random_uuid(),
  tenant_id             uuid              not null,
  load_index            numeric           not null check (load_index >= 0 and load_index <= 1),
  status                text              not null check (status in ('ok', 'elevated', 'high', 'critical')),
  recommendations       jsonb             not null default '[]'::jsonb,
  burnout_risk_flagged  boolean           not null,
  created_at            timestamptz       not null default now()
);

create index if not exists nervous_system_reports_tenant_created_idx
  on nervous_system_reports (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on nervous_system_reports (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table nervous_system_reports enable row level security;

-- =============================================================================
-- nervous_system_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy nervous_system_reports_select on nervous_system_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy nervous_system_reports_insert on nervous_system_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0184_progress_assessments.sql >>>>>
-- =============================================================================
-- Migration: 0184_progress_assessments.sql
-- Purpose:   Stand up the True Progress Engine (outcome engines) — a single
--            `progress_assessments` table that classifies an initiative by what it
--            actually creates (real vs fake progress, maintenance, distraction,
--            risk/revenue/leverage/freedom creation), scores its real outcome
--            value, and recommends an action (keep / delegate / automate / pause /
--            delete / simplify / convert_to_ip / move_to_later / assign_to_agent).
--            It must never confuse intensity with progress. Implements
--            ADR-0107-outcome-engines on the tenant-scoped platform.
--
--            NOTE: the Relaxation Outcome plans, capital reports, consequence
--            projections, and pyramid placements are READ-MODELS and get no
--            tables; only True Progress assessments are persisted here.
--
-- PROGRESS ASSESSMENT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME ASSESSMENT for one initiative: the
--     engine classifies it and writes out the result as a dated record
--     (`created_at`).
--   - `kind` is the classification; `outcome_score` is the 0..1 real outcome
--     value; `recommended_action` is the disposition; `reason` explains it.
--   - Assessments are APPEND-ONLY: a row is a recorded classification, not edited
--     in place. There is no updated_at and no trigger — re-assessing appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every assessment immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- progress_assessments — a computed point-in-time True Progress classification
-- for one initiative. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists progress_assessments (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  initiative          text              not null,
  kind                text              not null check (kind in (
                                          'real_progress', 'fake_progress', 'maintenance', 'distraction',
                                          'risk_reduction', 'revenue_creation', 'leverage_creation',
                                          'freedom_creation')),
  outcome_score       numeric           not null check (outcome_score >= 0 and outcome_score <= 1),
  recommended_action  text              not null check (recommended_action in (
                                          'keep', 'delegate', 'automate', 'pause', 'delete', 'simplify',
                                          'convert_to_ip', 'move_to_later', 'assign_to_agent')),
  reason              text              not null,
  created_at          timestamptz       not null default now()
);

create index if not exists progress_assessments_tenant_created_idx
  on progress_assessments (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on progress_assessments (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table progress_assessments enable row level security;

-- =============================================================================
-- progress_assessments — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing assessment immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy progress_assessments_select on progress_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy progress_assessments_insert on progress_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0185_capital_reports.sql >>>>>
-- =============================================================================
-- Migration: 0185_capital_reports.sql
-- Purpose:   Stand up the Capital Engine — a single `capital_reports` table that
--            stores, for a recommendation, how much of each of the ten forms of
--            capital increases or decreases (the deltas), the net capital change,
--            the compounding effect, the payoff horizon, and the plausible
--            conversion paths between capital forms. Optimizes for lifetime
--            capital accumulation rather than short-term activity. Implements
--            ADR-0108-capital-engine on the tenant-scoped platform.
--
-- CAPITAL REPORT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REPORT for one recommendation: the
--     engine scores the capital impact and writes it out as a dated record
--     (`created_at`).
--   - `deltas` holds the per-capital changes (-1..1); `increases` / `decreases`
--     list the capital types that grow / deplete; `net_capital` is the -1..1 net
--     change; `compounding` is 0..1; `payoff_months` is the horizon;
--     `conversion_paths` are the plausible capital-to-capital conversions.
--   - Reports are APPEND-ONLY: a row is a recorded analysis, not edited in place.
--     There is no updated_at and no trigger — re-running appends a new report.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every report immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- capital_reports — a computed point-in-time capital growth report for one
-- recommendation. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists capital_reports (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  recommendation    text              not null,
  deltas            jsonb             not null default '{}'::jsonb,
  increases         jsonb             not null default '[]'::jsonb,
  decreases         jsonb             not null default '[]'::jsonb,
  net_capital       numeric           not null check (net_capital >= -1 and net_capital <= 1),
  compounding       numeric           not null check (compounding >= 0 and compounding <= 1),
  payoff_months     numeric           not null check (payoff_months >= 0),
  conversion_paths  jsonb             not null default '[]'::jsonb,
  created_at        timestamptz       not null default now()
);

create index if not exists capital_reports_tenant_created_idx
  on capital_reports (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on capital_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table capital_reports enable row level security;

-- =============================================================================
-- capital_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy capital_reports_select on capital_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy capital_reports_insert on capital_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0186_rnd_discoveries.sql >>>>>
-- =============================================================================
-- Migration: 0186_rnd_discoveries.sql
-- Purpose:   Stand up the Research & Development Department — a single
--            `rnd_discoveries` table that stores, for each evaluated discovery,
--            its domain, the assigned disposition (learn / test / implement /
--            ignore / watch / invest / build_on / partner), the confidence it is
--            worth acting on, whether it clears the high-confidence threshold and
--            should be surfaced, the rationale, and the next step. Keeps Alyssa
--            ahead by surfacing only high-confidence opportunities. Implements
--            ADR-0111-rnd on the tenant-scoped platform.
--
-- RND DISCOVERY MODEL
--   - Each row is a COMPUTED POINT-IN-TIME EVALUATION for one discovery: the
--     engine scores it and writes out the result as a dated record
--     (`created_at`).
--   - `domain` is the discovery domain; `disposition` is the assigned action;
--     `confidence` is the 0..1 confidence it is worth acting on;
--     `high_confidence` is true when it clears the threshold and should be
--     surfaced; `rationale` and `next_step` explain and direct it.
--   - Discoveries are APPEND-ONLY: a row is a recorded evaluation, not edited in
--     place. There is no updated_at and no trigger — re-evaluating appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every discovery immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- rnd_discoveries — a computed point-in-time evaluation for one discovery.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists rnd_discoveries (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  domain            text              not null check (domain in (
                                        'ai_model', 'github_repo', 'research_paper', 'patent', 'startup',
                                        'competitor', 'api', 'hardware', 'quantum', 'security', 'robotics',
                                        'healthcare', 'construction', 'real_estate', 'finance', 'regulation',
                                        'emerging_industry', 'workflow', 'automation')),
  title             text              not null,
  disposition       text              not null check (disposition in (
                                        'learn', 'test', 'implement', 'ignore', 'watch', 'invest',
                                        'build_on', 'partner')),
  confidence        numeric           not null check (confidence >= 0 and confidence <= 1),
  high_confidence   boolean           not null,
  rationale         text              not null,
  next_step         text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists rnd_discoveries_tenant_created_idx
  on rnd_discoveries (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on rnd_discoveries (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table rnd_discoveries enable row level security;

-- =============================================================================
-- rnd_discoveries — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing discovery immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy rnd_discoveries_select on rnd_discoveries
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy rnd_discoveries_insert on rnd_discoveries
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0187_acquisition_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0187_acquisition_evaluations.sql
-- Purpose:   Stand up the Acquisition Engine — a single `acquisition_evaluations`
--            table that stores, for any opportunity, the per-path verdicts (build /
--            buy / partner / license / white_label / acquire / invest / ignore)
--            scored on time, cost, revenue, risk, leverage, complexity, and
--            strategic value, the single recommended path, and the reason. Teaches
--            Alfy² to think like a capital allocator. Implements ADR-0112-acquisition
--            on the tenant-scoped platform.
--
-- ACQUISITION EVALUATION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME EVALUATION for one opportunity: the
--     engine scores every capture path and writes out the result as a dated record
--     (`created_at`).
--   - `opportunity` is what was evaluated; `verdicts` is the per-strategy scoring
--     array; `recommendation` is the chosen path; `reason` explains it.
--   - Evaluations are APPEND-ONLY: a row is a recorded verdict, not edited in
--     place. There is no updated_at and no trigger — re-evaluating appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every evaluation immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- acquisition_evaluations — a computed point-in-time evaluation for one
-- opportunity. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists acquisition_evaluations (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  opportunity       text              not null,
  verdicts          jsonb             not null default '[]'::jsonb,
  recommendation    text              not null check (recommendation in (
                                        'build', 'buy', 'partner', 'license', 'white_label',
                                        'acquire', 'invest', 'ignore')),
  reason            text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists acquisition_evaluations_tenant_created_idx
  on acquisition_evaluations (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on acquisition_evaluations (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table acquisition_evaluations enable row level security;

-- =============================================================================
-- acquisition_evaluations — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing evaluation immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy acquisition_evaluations_select on acquisition_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy acquisition_evaluations_insert on acquisition_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0188_freedom_index_readings.sql >>>>>
-- =============================================================================
-- Migration: 0188_freedom_index_readings.sql
-- Purpose:   Stand up the Founder Freedom Index — a single
--            `freedom_index_readings` table that stores each period's freedom
--            score (0–100), the trend (increasing / flat / decreasing), the
--            biggest bottleneck, and a recommendation. Measures whether Alfy²
--            is removing time, decision load, and stress while preserving revenue
--            and returning life. Implements ADR-0114-freedom-index on the
--            tenant-scoped platform.
--
-- FREEDOM INDEX READING MODEL
--   - Each row is a COMPUTED POINT-IN-TIME READING for one period: the engine
--     scores the inputs and writes out the result as a dated record
--     (`created_at`).
--   - `period_label` names the period; `score` is the 0–100 freedom score;
--     `trend` is the direction versus the prior reading; `biggest_bottleneck`
--     and `recommendation` direct the next improvement.
--   - Readings are APPEND-ONLY: a row is a recorded measurement, not edited in
--     place. There is no updated_at and no trigger — re-measuring appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every reading immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- freedom_index_readings — a computed point-in-time reading for one period.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists freedom_index_readings (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  period_label        text              not null,
  score               numeric           not null check (score >= 0 and score <= 100),
  trend               text              not null check (trend in (
                                          'increasing', 'flat', 'decreasing')),
  biggest_bottleneck  text              not null,
  recommendation      text              not null,
  created_at          timestamptz       not null default now()
);

create index if not exists freedom_index_readings_tenant_created_idx
  on freedom_index_readings (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on freedom_index_readings (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table freedom_index_readings enable row level security;

-- =============================================================================
-- freedom_index_readings — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing reading immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy freedom_index_readings_select on freedom_index_readings
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy freedom_index_readings_insert on freedom_index_readings
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0189_life_roi_assessments.sql >>>>>
-- =============================================================================
-- Migration: 0189_life_roi_assessments.sql
-- Purpose:   Stand up the Life ROI Engine — a single `life_roi_assessments`
--            table that stores, for each workflow, both Financial ROI and Life
--            ROI: hours saved per year, workdays returned, financial ROI ratio,
--            decisions/meetings/emails eliminated, freedom gained, the composite
--            Life ROI score, and a summary. Alfy² optimizes for life returned,
--            not only money earned. Implements ADR-0115-life-roi on the
--            tenant-scoped platform.
--
-- LIFE ROI ASSESSMENT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME ASSESSMENT for one workflow: the
--     engine computes the dual ROI and writes out the result as a dated record
--     (`created_at`).
--   - `workflow` is what was assessed; the numeric columns capture time/financial
--     return and the 0..1 freedom and composite Life ROI scores; `summary`
--     explains it.
--   - Assessments are APPEND-ONLY: a row is a recorded calculation, not edited in
--     place. There is no updated_at and no trigger — re-assessing appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every assessment immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- life_roi_assessments — a computed point-in-time assessment for one workflow.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists life_roi_assessments (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  workflow                text              not null,
  hours_saved_per_year    numeric           not null check (hours_saved_per_year >= 0),
  workdays_returned       numeric           not null check (workdays_returned >= 0),
  financial_roi           numeric           not null,
  decisions_eliminated    integer           not null check (decisions_eliminated >= 0),
  meetings_eliminated     integer           not null check (meetings_eliminated >= 0),
  emails_eliminated       integer           not null check (emails_eliminated >= 0),
  freedom_gained          numeric           not null check (freedom_gained >= 0 and freedom_gained <= 1),
  life_roi_score          numeric           not null check (life_roi_score >= 0 and life_roi_score <= 1),
  summary                 text              not null,
  created_at              timestamptz       not null default now()
);

create index if not exists life_roi_assessments_tenant_created_idx
  on life_roi_assessments (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on life_roi_assessments (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table life_roi_assessments enable row level security;

-- =============================================================================
-- life_roi_assessments — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing assessment immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy life_roi_assessments_select on life_roi_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy life_roi_assessments_insert on life_roi_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0190_never_again_solutions.sql >>>>>
-- =============================================================================
-- Migration: 0190_never_again_solutions.sql
-- Purpose:   Stand up the Never Again Engine — a single `never_again_solutions`
--            table that turns a repeated frustration (i_forgot / happened_again /
--            annoying / i_hate_this / always_breaks / wastes_time) into permanent
--            infrastructure: problem, root cause, permanent solution, and the
--            workflow, automation, agent, checklist, SOP, reminder, knowledge
--            update, and policy that ensure nothing annoys Alyssa twice.
--            Implements ADR-0116-never-again on the tenant-scoped platform.
--
-- NEVER AGAIN SOLUTION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SOLUTION for one frustration: the
--     engine derives the permanent fix and writes out the result as a dated
--     record (`created_at`).
--   - `trigger` is the frustration signal; `problem`/`root_cause`/
--     `permanent_solution` and the infrastructure columns capture the fix;
--     `checklist` is the jsonb steps; `priority` rises with occurrences.
--   - Solutions are APPEND-ONLY: a row is a recorded resolution, not edited in
--     place. There is no updated_at and no trigger — re-solving appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every solution immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- never_again_solutions — a computed point-in-time solution for one frustration.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists never_again_solutions (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  trigger             text              not null check (trigger in (
                                          'i_forgot', 'happened_again', 'annoying', 'i_hate_this',
                                          'always_breaks', 'wastes_time')),
  problem             text              not null,
  root_cause          text              not null,
  permanent_solution  text              not null,
  workflow            text              not null default '',
  automation          text              not null default '',
  agent               text              not null default '',
  checklist           jsonb             not null default '[]'::jsonb,
  sop                 text              not null default '',
  reminder            text              not null default '',
  knowledge_update    text              not null default '',
  policy              text              not null default '',
  priority            numeric           not null check (priority >= 0 and priority <= 1),
  created_at          timestamptz       not null default now()
);

create index if not exists never_again_solutions_tenant_created_idx
  on never_again_solutions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on never_again_solutions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table never_again_solutions enable row level security;

-- =============================================================================
-- never_again_solutions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing solution immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy never_again_solutions_select on never_again_solutions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy never_again_solutions_insert on never_again_solutions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0191_self_improvement_reports.sql >>>>>
-- =============================================================================
-- Migration: 0191_self_improvement_reports.sql
-- Purpose:   Stand up the Enterprise Self-Improvement Engine — a single
--            `self_improvement_reports` table that stores each period's
--            evaluation of the operating system itself: the findings (what is
--            slow, duplicated, fragile, confusing, or should be simplified,
--            merged, retired, or promoted), the refactoring plan, the tech-debt
--            report, and the net complexity delta the plan implies. The goal:
--            Alfy² improves continuously without becoming more complicated.
--            Implements ADR-0117-self-improvement on the tenant-scoped platform.
--
-- SELF-IMPROVEMENT REPORT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME REPORT for one period: the engine
--     evaluates the system and writes out the result as a dated record
--     (`created_at`).
--   - `period_label` names the period; `findings`, `refactoring_plan`, and
--     `tech_debt` are jsonb arrays; `complexity_delta` is the net change the plan
--     implies (negative-leaning = simpler).
--   - Reports are APPEND-ONLY: a row is a recorded evaluation, not edited in
--     place. There is no updated_at and no trigger — re-evaluating appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every report immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- self_improvement_reports — a computed point-in-time report for one period.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists self_improvement_reports (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  period_label        text              not null,
  findings            jsonb             not null default '[]'::jsonb,
  refactoring_plan    jsonb             not null default '[]'::jsonb,
  tech_debt           jsonb             not null default '[]'::jsonb,
  complexity_delta    numeric           not null check (complexity_delta >= -1 and complexity_delta <= 1),
  created_at          timestamptz       not null default now()
);

create index if not exists self_improvement_reports_tenant_created_idx
  on self_improvement_reports (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on self_improvement_reports (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table self_improvement_reports enable row level security;

-- =============================================================================
-- self_improvement_reports — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing report immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy self_improvement_reports_select on self_improvement_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy self_improvement_reports_insert on self_improvement_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0192_identity_anchors.sql >>>>>
-- =============================================================================
-- Migration: 0192_identity_anchors.sql
-- Purpose:   Stand up the Identity OS — a single `identity_anchors` table that
--            stores Alyssa's identity anchors (mission, core value, long-term
--            vision, personal/business philosophy, non-negotiable, lifestyle /
--            family / health / legacy goal, never-sacrifice), each with a
--            statement and a weight, so every major recommendation can be checked
--            against them. Identity OVERRIDES optimization whenever they conflict.
--            Implements ADR-0122-identity-os on the tenant-scoped platform.
--
-- IDENTITY ANCHOR MODEL
--   - Each row is a stored identity anchor: its `kind`, the `statement`, and a
--     `weight` (higher = weightier; non-negotiables/never-sacrifice should be
--     high).
--   - Anchors are revised as Alyssa's identity is refined — statement and weight
--     are UPDATED in place — so the table is MUTABLE: it carries updated_at and
--     the shared set_updated_at() trigger from 0001 (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then full CRUD policies scope
--   rows to the current tenant via current_setting('app.tenant_id', true).
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- identity_anchors — a stored identity anchor, updated in place as Alyssa's
-- identity is revised. Mutable (carries updated_at + set_updated_at trigger).
-- -----------------------------------------------------------------------------
create table if not exists identity_anchors (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  kind              text              not null check (kind in (
                                        'mission', 'core_value', 'long_term_vision', 'personal_philosophy',
                                        'business_philosophy', 'non_negotiable', 'lifestyle_goal',
                                        'family_goal', 'health_priority', 'legacy_goal', 'never_sacrifice')),
  statement         text              not null,
  weight            numeric           not null check (weight >= 0 and weight <= 1),
  created_at        timestamptz       not null default now(),
  updated_at        timestamptz
);

create index if not exists identity_anchors_tenant_created_idx
  on identity_anchors (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for identity_anchors. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_identity_anchors on identity_anchors;
create trigger set_updated_at_identity_anchors
  before update on identity_anchors
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Enable RLS on identity_anchors (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table identity_anchors enable row level security;

-- =============================================================================
-- identity_anchors — mutable: an anchor is recorded, then updated in place as
-- Alyssa's identity is revised. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy identity_anchors_select on identity_anchors
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy identity_anchors_insert on identity_anchors
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy identity_anchors_update on identity_anchors
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy identity_anchors_delete on identity_anchors
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0193_philosophies.sql >>>>>
-- =============================================================================
-- Migration: 0193_philosophies.sql
-- Purpose:   Stand up the Philosophy Library — a single `philosophies` table that
--            stores every principle, equation, framework, mental model, operating
--            philosophy, and insight that defines Alfy²: name, purpose,
--            explanation, visual diagram, examples, related algorithms/agents,
--            businesses using it, a Core pin, and a revision count — so one can
--            be surfaced as "Today's Reminder" each day. Implements
--            ADR-0123-philosophy-library on the tenant-scoped platform.
--
-- PHILOSOPHY MODEL
--   - Each row is a stored philosophy: its name, purpose, explanation, and visual
--     diagram; jsonb arrays for examples, related algorithms, related agents, and
--     businesses using it; a `core` pin; and a `revision` count.
--   - Philosophies support revision history and pinning — they are UPDATED in
--     place (revision increments, core toggles, text is refined) — so the table
--     is MUTABLE: it carries updated_at and the shared set_updated_at() trigger
--     from 0001 (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then full CRUD policies scope
--   rows to the current tenant via current_setting('app.tenant_id', true).
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- philosophies — a stored philosophy, updated in place to support revision
-- history and pinning. Mutable (carries updated_at + set_updated_at trigger).
-- -----------------------------------------------------------------------------
create table if not exists philosophies (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  name                text              not null,
  purpose             text              not null default '',
  explanation         text              not null default '',
  visual_diagram      text              not null default '',
  examples            jsonb             not null default '[]'::jsonb,
  related_algorithms  jsonb             not null default '[]'::jsonb,
  related_agents      jsonb             not null default '[]'::jsonb,
  businesses_using    jsonb             not null default '[]'::jsonb,
  core                boolean           not null default false,
  revision            integer           not null default 0 check (revision >= 0),
  created_at          timestamptz       not null default now(),
  updated_at          timestamptz
);

create index if not exists philosophies_tenant_created_idx
  on philosophies (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for philosophies. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_philosophies on philosophies;
create trigger set_updated_at_philosophies
  before update on philosophies
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Enable RLS on philosophies (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table philosophies enable row level security;

-- =============================================================================
-- philosophies — mutable: a philosophy is recorded, then updated in place as it
-- is revised and pinned. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy philosophies_select on philosophies
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy philosophies_insert on philosophies
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy philosophies_update on philosophies
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy philosophies_delete on philosophies
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0194_conversation_extractions.sql >>>>>
-- =============================================================================
-- Migration: 0194_conversation_extractions.sql
-- Purpose:   Stand up the Conversation Engine — a single
--            `conversation_extractions` table that stores, for each natural
--            utterance, what Alfy² extracted as a thinking partner: clarifying
--            questions, connections to existing knowledge, opportunities,
--            respectfully challenged assumptions, options, detected patterns, the
--            remembered conclusion, and the outputs the conversation should
--            become (tasks, assets, agents, businesses, workflows, knowledge,
--            capital) — nothing executes without approval. Implements
--            ADR-0124-conversation on the tenant-scoped platform.
--
-- CONVERSATION EXTRACTION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME EXTRACTION for one utterance: the
--     engine listens and writes out the result as a dated record (`created_at`).
--   - `utterance` is what was said; the jsonb arrays capture the thinking-partner
--     output; `conclusion` is the remembered conclusion; `outputs` is what the
--     conversation should be built into.
--   - Extractions are APPEND-ONLY: a row is a recorded listening, not edited in
--     place. There is no updated_at and no trigger — re-processing appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every extraction immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- conversation_extractions — a computed point-in-time extraction for one
-- utterance. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists conversation_extractions (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  utterance               text              not null,
  clarifying_questions    jsonb             not null default '[]'::jsonb,
  connections             jsonb             not null default '[]'::jsonb,
  opportunities           jsonb             not null default '[]'::jsonb,
  challenged_assumptions  jsonb             not null default '[]'::jsonb,
  options                 jsonb             not null default '[]'::jsonb,
  patterns                jsonb             not null default '[]'::jsonb,
  conclusion              text              not null default '',
  outputs                 jsonb             not null default '[]'::jsonb,
  created_at              timestamptz       not null default now()
);

create index if not exists conversation_extractions_tenant_created_idx
  on conversation_extractions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on conversation_extractions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table conversation_extractions enable row level security;

-- =============================================================================
-- conversation_extractions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing extraction immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy conversation_extractions_select on conversation_extractions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy conversation_extractions_insert on conversation_extractions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0195_vision_sessions.sql >>>>>
-- =============================================================================
-- Migration: 0195_vision_sessions.sql
-- Purpose:   Stand up the Vision Builder — a single `vision_sessions` table that
--            stores each collaborative thinking session: the idea, the
--            thought-partner phase (exploration, challenges, strengthened points,
--            risks, opportunities), the generated artifacts (architecture,
--            implementation plan, business model, marketing, monetization, assets,
--            agents, workflows, roadmap), the overall promise, and the
--            always-true awaiting_approval flag — Vision Builder never
--            auto-executes. Implements ADR-0125-vision-builder on the
--            tenant-scoped platform.
--
-- VISION SESSION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME SESSION for one idea: the engine acts
--     as a thought partner and writes out the result as a dated record
--     (`created_at`).
--   - `idea` is what was explored; the jsonb arrays capture the thought-partner
--     phase and the generated artifacts; `promise` is the 0..1 overall promise;
--     `awaiting_approval` is always true — execution begins only after approval.
--   - Sessions are APPEND-ONLY: a row is a recorded session, not edited in place.
--     There is no updated_at and no trigger — re-exploring appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every session immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- vision_sessions — a computed point-in-time session for one idea.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists vision_sessions (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  idea                text              not null,
  exploration         jsonb             not null default '[]'::jsonb,
  challenges          jsonb             not null default '[]'::jsonb,
  strengthened        jsonb             not null default '[]'::jsonb,
  risks               jsonb             not null default '[]'::jsonb,
  opportunities       jsonb             not null default '[]'::jsonb,
  artifacts           jsonb             not null default '[]'::jsonb,
  promise             numeric           not null check (promise >= 0 and promise <= 1),
  awaiting_approval   boolean           not null default true check (awaiting_approval = true),
  created_at          timestamptz       not null default now()
);

create index if not exists vision_sessions_tenant_created_idx
  on vision_sessions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on vision_sessions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table vision_sessions enable row level security;

-- =============================================================================
-- vision_sessions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing session immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy vision_sessions_select on vision_sessions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy vision_sessions_insert on vision_sessions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0196_executive_operating_manuals.sql >>>>>
-- =============================================================================
-- Migration: 0196_executive_operating_manuals.sql
-- Purpose:   Stand up the Executive Operating Manual — a single
--            `executive_operating_manuals` table that stores each assembled,
--            living description of how Alfy² operates across every domain
--            (architecture, agents, algorithms, departments, policies, connectors,
--            integrations, workflows, security, approvals, capital_allocation,
--            constitution, operating_rhythm): the per-domain sections, the set of
--            domains whose source has drifted (`stale_domains`), and the
--            `fully_current` flag that is true only when every section is current.
--            So documentation never silently goes stale. Composes the Operating
--            Manual Generator (0095). Implements ADR-0119-exec-operating-manual on
--            the tenant-scoped platform.
--
-- EXECUTIVE OPERATING MANUAL MODEL
--   - Each row is a COMPUTED POINT-IN-TIME ASSEMBLY of the whole manual: the
--     read-model walks every domain's source state, writes each section's summary
--     and staleness, and records the result as a dated snapshot (`created_at`).
--   - `sections` is the per-domain array (domain, summary, stale); `stale_domains`
--     is the derived list of drifted domains; `fully_current` is true when none
--     are stale.
--   - Assemblies are APPEND-ONLY: a row is a recorded snapshot, not edited in
--     place. There is no updated_at and no trigger — re-assembling appends a row,
--     preserving the history of how the manual looked over time.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every assembly immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- executive_operating_manuals — a computed point-in-time assembly of the manual.
-- Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists executive_operating_manuals (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  sections          jsonb             not null default '[]'::jsonb,
  stale_domains     jsonb             not null default '[]'::jsonb,
  fully_current     boolean           not null,
  created_at        timestamptz       not null default now()
);

create index if not exists executive_operating_manuals_tenant_created_idx
  on executive_operating_manuals (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on executive_operating_manuals (deny-by-default until policies added).
-- -----------------------------------------------------------------------------
alter table executive_operating_manuals enable row level security;

-- =============================================================================
-- executive_operating_manuals — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing assembly immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy executive_operating_manuals_select on executive_operating_manuals
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy executive_operating_manuals_insert on executive_operating_manuals
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0197_loop_placements.sql >>>>>
-- =============================================================================
-- Migration: 0197_loop_placements.sql
-- Purpose:   Stand up the Infinite Loop placement store — a single
--            `loop_placements` table that records, for one module, where it sits
--            in Alfy²'s highest-level operating cycle (Observe -> Capture ->
--            Organize -> Understand -> Decide -> Execute -> Measure -> Reflect ->
--            Improve -> Compound -> Multiply -> Increase Freedom -> Observe again):
--            its `primary_stage` (the stage it most strongly performs), the
--            `feeds_stage` it hands off to next, the `in_loop` flag (true when the
--            module participates at all), and a `note`. No feature exists outside
--            the loop; everything feeds the next cycle so the system compounds.
--            Implements ADR-0120-infinite-loop on the tenant-scoped platform.
--
-- LOOP PLACEMENT MODEL
--   - Each row is a COMPUTED POINT-IN-TIME PLACEMENT for one module: the engine
--     scores the module's strength at each of the twelve stages and writes out the
--     dominant stage, the stage it feeds, and whether it is in the loop, as a
--     dated record (`created_at`).
--   - `module` is what was placed; `primary_stage`/`feeds_stage` are constrained to
--     the twelve loop stages; `in_loop` is the participation flag; `note` explains
--     the placement.
--   - Placements are APPEND-ONLY: a row is a recorded placement, not edited in
--     place. There is no updated_at and no trigger — re-placing appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--   - Stage enums are mirrored from LoopStageSchema in
--     packages/shared/src/contracts/infinite-loop.ts via CHECK constraints.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every placement immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- loop_placements — a computed point-in-time placement for one module.
-- Append-only (no updated_at, no trigger). Stage columns constrained to the
-- twelve loop stages from LoopStageSchema.
-- -----------------------------------------------------------------------------
create table if not exists loop_placements (
  id                uuid              primary key default gen_random_uuid(),
  tenant_id         uuid              not null,
  module            text              not null,
  primary_stage     text              not null check (primary_stage in (
                                        'observe', 'capture', 'organize', 'understand',
                                        'decide', 'execute', 'measure', 'reflect',
                                        'improve', 'compound', 'multiply', 'increase_freedom')),
  feeds_stage       text              not null check (feeds_stage in (
                                        'observe', 'capture', 'organize', 'understand',
                                        'decide', 'execute', 'measure', 'reflect',
                                        'improve', 'compound', 'multiply', 'increase_freedom')),
  in_loop           boolean           not null,
  note              text              not null,
  created_at        timestamptz       not null default now()
);

create index if not exists loop_placements_tenant_created_idx
  on loop_placements (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on loop_placements (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table loop_placements enable row level security;

-- =============================================================================
-- loop_placements — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing placement immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy loop_placements_select on loop_placements
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy loop_placements_insert on loop_placements
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0198_spec_merge_upgrades.sql >>>>>
-- =============================================================================
-- Migration: 0198_spec_merge_upgrades.sql
-- Purpose:   Persistence-layer changes for the "merge / update" upgrades that
--            extended three already-built engines to cover an expanded spec
--            (building on top of the existing system, not replacing it):
--
--            1. Executive Legacy Archive — widen `legacy_items.kind` to the full
--               lifetime-of-work taxonomy (adds company, podcast, letter, video,
--               voice_note, journal, case_study, client_transformation,
--               business_philosophy). Mirrors LegacyItemKindSchema.
--            2. Simplicity Engine (folded into Self-Improvement) — add the four
--               Simplicity scores to `self_improvement_reports`
--               (complexity / leverage / maintainability / user_friction).
--            3. Conversation-to-Reality — add `conversation_extractions.input_categories`
--               (what the utterance is ABOUT, before it becomes outputs).
--
--            No table is created here. All changes are additive and idempotent;
--            existing rows keep working (new columns default, CHECK only widens).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. legacy_items.kind — widen the CHECK to the full archive taxonomy.
--    The inline CHECK from 0152 is auto-named legacy_items_kind_check; drop and
--    recreate it with the superset. This only ADDS allowed values.
-- -----------------------------------------------------------------------------
alter table legacy_items drop constraint if exists legacy_items_kind_check;
alter table legacy_items add constraint legacy_items_kind_check check (kind in (
  'framework','playbook','operating_manual','podcast_lesson','book','talk','business_system',
  'decision_journal','mistake','success',
  -- Executive Legacy Archive additions
  'company','podcast','letter','video','voice_note','journal','case_study',
  'client_transformation','business_philosophy'));

-- -----------------------------------------------------------------------------
-- 2. self_improvement_reports — Simplicity Engine scores (0..1). Default 0.5 so
--    historical reports remain valid.
-- -----------------------------------------------------------------------------
alter table self_improvement_reports
  add column if not exists complexity_score double precision not null default 0.5
    check (complexity_score >= 0 and complexity_score <= 1);
alter table self_improvement_reports
  add column if not exists leverage_score double precision not null default 0.5
    check (leverage_score >= 0 and leverage_score <= 1);
alter table self_improvement_reports
  add column if not exists maintainability_score double precision not null default 0.5
    check (maintainability_score >= 0 and maintainability_score <= 1);
alter table self_improvement_reports
  add column if not exists user_friction_score double precision not null default 0.5
    check (user_friction_score >= 0 and user_friction_score <= 1);

-- -----------------------------------------------------------------------------
-- 3. conversation_extractions — detected input categories (jsonb array of the
--    ConversationInputCategory enum). Default empty so existing rows are valid.
-- -----------------------------------------------------------------------------
alter table conversation_extractions
  add column if not exists input_categories jsonb not null default '[]'::jsonb;

-- >>>>> 0199_voice_personas.sql >>>>>
-- =============================================================================
-- Migration: 0199_voice_personas.sql
-- Purpose:   Stand up the Companion Voice Persona — a single `voice_personas`
--            table storing the named voice companion that is the VOICE LAYER of
--            Alfy² (not a separate brain): its name, accent (default British
--            female), tonal qualities, and duties. Implements ADR-0127 on the
--            tenant-scoped platform.
--
-- VOICE PERSONA MODEL
--   - A persona is MUTABLE configuration: it is refined over time, so the table
--     carries updated_at and a set_updated_at() trigger (mutable convention).
--   - is_voice_layer_only is pinned true (DB CHECK): the persona never becomes
--     the brain; the intelligence remains Alfy².
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS enabled below with no permissive default, then SELECT + INSERT + UPDATE
--   policies scope rows to current_setting('app.tenant_id', true). No DELETE
--   policy (personas are refined, not deleted).
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

create table if not exists voice_personas (
  id                   uuid              primary key default gen_random_uuid(),
  tenant_id            uuid              not null,
  name                 text              not null,
  accent               text              not null default 'British (female)',
  tones                jsonb             not null default '[]'::jsonb,
  duties               jsonb             not null default '[]'::jsonb,
  is_voice_layer_only  boolean           not null default true check (is_voice_layer_only = true),
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz       not null default now()
);

create index if not exists voice_personas_tenant_idx on voice_personas (tenant_id);

-- updated_at trigger (mutable table). Reuses set_updated_at() from 0001.
drop trigger if exists set_updated_at_voice_personas on voice_personas;
create trigger set_updated_at_voice_personas
  before update on voice_personas
  for each row execute function set_updated_at();

alter table voice_personas enable row level security;

create policy voice_personas_select on voice_personas
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy voice_personas_insert on voice_personas
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy voice_personas_update on voice_personas
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0200_personal_executive_models.sql >>>>>
-- =============================================================================
-- Migration: 0200_personal_executive_models.sql
-- Purpose:   Stand up the Personal Executive Model (PEM) — a single
--            `personal_executive_models` table storing the learned profile of how
--            Alyssa operates (traits across decision patterns, communication
--            style, opportunity recognition, risk tolerance, energy, workflows,
--            approval habits, priorities, bottlenecks, values, mission). The model
--            amplifies, never imitates, and never replaces her judgment.
--            Implements ADR-0128 on the tenant-scoped platform.
--
-- PEM MODEL
--   - MUTABLE: the model evolves through explicit feedback, observed outcomes, and
--     recurring behavior, so the table carries updated_at + set_updated_at().
--   - traits is the jsonb array of learned traits (each with confidence + source +
--     evidence_refs). Explainability lives in the contract (PemExplanation) and is
--     attached to recommendations at compute time, not stored here.
--   - amplifies_not_imitates pinned true (DB CHECK) — agency is preserved.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists personal_executive_models (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  traits                   jsonb             not null default '[]'::jsonb,
  amplifies_not_imitates   boolean           not null default true check (amplifies_not_imitates = true),
  created_at               timestamptz       not null default now(),
  updated_at               timestamptz       not null default now()
);

create index if not exists personal_executive_models_tenant_idx on personal_executive_models (tenant_id);

drop trigger if exists set_updated_at_personal_executive_models on personal_executive_models;
create trigger set_updated_at_personal_executive_models
  before update on personal_executive_models
  for each row execute function set_updated_at();

alter table personal_executive_models enable row level security;

create policy personal_executive_models_select on personal_executive_models
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy personal_executive_models_insert on personal_executive_models
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy personal_executive_models_update on personal_executive_models
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0201_meeting_prep.sql >>>>>
-- =============================================================================
-- Migration: 0201_meeting_prep.sql
-- Purpose:   Stand up Meeting Prep — two APPEND-ONLY tables: `meeting_dossiers`
--            (the pre-meeting executive dossier) and `meeting_recaps` (the
--            post-meeting capture). Each makes a meeting feel like an executive
--            team prepared Alyssa beforehand and captured the outcome afterward.
--            Implements ADR-0129 on the tenant-scoped platform.
--
-- MODEL
--   - Both tables are POINT-IN-TIME / APPEND-ONLY: a dossier is the prep produced
--     for one meeting; a recap is what was captured after. No updated_at, no
--     trigger. A recap may reference its dossier (dossier_id, nullable).
--   - Rich fields are stored as jsonb arrays (talking points, risks, etc.).
--
-- RLS: deny-by-default; SELECT + INSERT only on each (immutable records). No
--   UPDATE/DELETE policy is created on purpose.
-- Idempotent where reasonable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- meeting_dossiers — the pre-meeting dossier. Append-only.
-- ---------------------------------------------------------------------------
create table if not exists meeting_dossiers (
  id                          uuid          primary key default gen_random_uuid(),
  tenant_id                   uuid          not null,
  title                       text          not null,
  when_at                     timestamptz   null,
  person_profile              text          not null default '',
  company_profile             text          not null default '',
  relationship_history        jsonb         not null default '[]'::jsonb,
  conversation_history        jsonb         not null default '[]'::jsonb,
  mutual_contacts             jsonb         not null default '[]'::jsonb,
  relevant_news               jsonb         not null default '[]'::jsonb,
  open_action_items           jsonb         not null default '[]'::jsonb,
  negotiation_opportunities   jsonb         not null default '[]'::jsonb,
  talking_points              jsonb         not null default '[]'::jsonb,
  questions_to_ask            jsonb         not null default '[]'::jsonb,
  potential_risks             jsonb         not null default '[]'::jsonb,
  supporting_documents        jsonb         not null default '[]'::jsonb,
  objective                   text          not null default '',
  desired_outcome             text          not null default '',
  created_at                  timestamptz   not null default now()
);

create index if not exists meeting_dossiers_tenant_created_idx
  on meeting_dossiers (tenant_id, created_at);

alter table meeting_dossiers enable row level security;

create policy meeting_dossiers_select on meeting_dossiers
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy meeting_dossiers_insert on meeting_dossiers
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- meeting_recaps — the post-meeting capture. Append-only.
-- ---------------------------------------------------------------------------
create table if not exists meeting_recaps (
  id                     uuid          primary key default gen_random_uuid(),
  tenant_id              uuid          not null,
  dossier_id             uuid          null,
  title                  text          not null,
  summary                text          not null default '',
  commitments            jsonb         not null default '[]'::jsonb,
  follow_ups             jsonb         not null default '[]'::jsonb,
  relationship_updates   jsonb         not null default '[]'::jsonb,
  next_actions           jsonb         not null default '[]'::jsonb,
  created_at             timestamptz   not null default now()
);

create index if not exists meeting_recaps_tenant_created_idx
  on meeting_recaps (tenant_id, created_at);

alter table meeting_recaps enable row level security;

create policy meeting_recaps_select on meeting_recaps
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy meeting_recaps_insert on meeting_recaps
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0202_relationship_records.sql >>>>>
-- =============================================================================
-- Migration: 0202_relationship_records.sql
-- Purpose:   Stand up the Relationship Capital Engine — a single
--            `relationship_records` table that treats each relationship as
--            long-term capital: party kind (family / friend / client / investor /
--            vendor / partner / podcast_guest / mentor / employee / advisor),
--            conversation & follow-up history, important dates, shared interests,
--            business opportunities, introductions, promises made, preferred
--            communication, health & strength (0..1), and surfaced value-creating
--            opportunities. Implements ADR-0130 on the tenant-scoped platform.
--
-- MODEL
--   - MUTABLE: relationship state evolves (health, strength, histories), so the
--     table carries updated_at + set_updated_at(). One row per (tenant, person).
--   - kind is constrained by CHECK mirrored from RelationshipPartyKindSchema.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists relationship_records (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  person_id                 text              not null,
  name                      text              not null,
  kind                      text              not null check (kind in (
                                                'family','friend','client','investor','vendor','partner',
                                                'podcast_guest','mentor','employee','advisor')),
  conversation_history      jsonb             not null default '[]'::jsonb,
  follow_up_history         jsonb             not null default '[]'::jsonb,
  important_dates           jsonb             not null default '[]'::jsonb,
  shared_interests          jsonb             not null default '[]'::jsonb,
  business_opportunities    jsonb             not null default '[]'::jsonb,
  introductions             jsonb             not null default '[]'::jsonb,
  promises_made             jsonb             not null default '[]'::jsonb,
  preferred_communication   text              not null default '',
  health                    double precision  not null default 0.5 check (health >= 0 and health <= 1),
  strength                  double precision  not null default 0.5 check (strength >= 0 and strength <= 1),
  opportunities             jsonb             not null default '[]'::jsonb,
  created_at                timestamptz       not null default now(),
  updated_at                timestamptz       not null default now()
);

create unique index if not exists relationship_records_tenant_person_idx
  on relationship_records (tenant_id, person_id);

drop trigger if exists set_updated_at_relationship_records on relationship_records;
create trigger set_updated_at_relationship_records
  before update on relationship_records
  for each row execute function set_updated_at();

alter table relationship_records enable row level security;

create policy relationship_records_select on relationship_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy relationship_records_insert on relationship_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy relationship_records_update on relationship_records
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0203_venture_studio_sessions.sql >>>>>
-- =============================================================================
-- Migration: 0203_venture_studio_sessions.sql
-- Purpose:   Stand up the Venture Studio — a single `venture_studio_sessions`
--            table that advances an idea into a company through 17 stages
--            (discovery -> founderos_integration). Every company inherits the
--            enterprise operating standards; no business starts from zero.
--            Implements ADR-0131 on the tenant-scoped platform.
--
-- MODEL
--   - MUTABLE: a session progresses through stages over time, so the table
--     carries updated_at + set_updated_at(). current_stage is constrained by a
--     CHECK mirrored from VentureStudioStageSchema; per-stage progress lives in
--     the `stages` jsonb.
--   - inherits_operating_standards pinned true (DB CHECK). awaiting_launch_approval
--     defaults true — nothing launches without approval.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists venture_studio_sessions (
  id                              uuid          primary key default gen_random_uuid(),
  tenant_id                       uuid          not null,
  idea                            text          not null,
  working_name                    text          not null default '',
  current_stage                   text          not null default 'discovery' check (current_stage in (
                                                   'discovery','validation','market','business_model','pricing',
                                                   'brand','technology','architecture','agents','automation',
                                                   'marketing','sales','finance','legal','launch','kpis',
                                                   'founderos_integration')),
  stages                          jsonb         not null default '[]'::jsonb,
  inherits_operating_standards    boolean       not null default true check (inherits_operating_standards = true),
  awaiting_launch_approval        boolean       not null default true,
  created_at                      timestamptz   not null default now(),
  updated_at                      timestamptz   not null default now()
);

create index if not exists venture_studio_sessions_tenant_created_idx
  on venture_studio_sessions (tenant_id, created_at);

drop trigger if exists set_updated_at_venture_studio_sessions on venture_studio_sessions;
create trigger set_updated_at_venture_studio_sessions
  before update on venture_studio_sessions
  for each row execute function set_updated_at();

alter table venture_studio_sessions enable row level security;

create policy venture_studio_sessions_select on venture_studio_sessions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy venture_studio_sessions_insert on venture_studio_sessions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy venture_studio_sessions_update on venture_studio_sessions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0204_thinking_pattern_observations.sql >>>>>
-- =============================================================================
-- Migration: 0204_thinking_pattern_observations.sql
-- Purpose:   Stand up the Alyssa Pattern Mirror — a single
--            `thinking_pattern_observations` table that records HOW Alyssa thinks
--            (thinking patterns, business pattern recognition, opportunity-detection
--            style, language preferences, decision criteria, intuition signals,
--            bottlenecks, creative breakthroughs, recurring themes, founder
--            instincts), with a confidence and whether the pattern recurs enough to
--            become a teachable framework. Amplifies and preserves; never imitates.
--            Implements ADR-0132 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one observation. No updated_at, no trigger.
--   - kind and amplification are constrained by CHECKs mirrored from the contract.
--   - framework_candidate flags observations to hand to Teach My Framework (0205).
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists thinking_pattern_observations (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  kind                text              not null check (kind in (
                                          'thinking_pattern','business_pattern_recognition',
                                          'opportunity_detection_style','language_preference',
                                          'decision_criterion','intuition_signal','bottleneck',
                                          'creative_breakthrough','recurring_theme','founder_instinct')),
  observation         text              not null,
  occurrences         integer           not null default 1 check (occurrences >= 1),
  confidence          double precision  not null default 0.5 check (confidence >= 0 and confidence <= 1),
  framework_candidate boolean           not null default false,
  amplification       text              not null check (amplification in (
                                          'personalize','suggest_agent','surface_opportunity','build_framework')),
  evidence_refs       jsonb             not null default '[]'::jsonb,
  created_at          timestamptz       not null default now()
);

create index if not exists thinking_pattern_observations_tenant_created_idx
  on thinking_pattern_observations (tenant_id, created_at);

alter table thinking_pattern_observations enable row level security;

create policy thinking_pattern_observations_select on thinking_pattern_observations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy thinking_pattern_observations_insert on thinking_pattern_observations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0205_taught_frameworks.sql >>>>>
-- =============================================================================
-- Migration: 0205_taught_frameworks.sql
-- Purpose:   Stand up the Teach My Framework Engine — a single `taught_frameworks`
--            table that stores named, teachable frameworks distilled from Alyssa's
--            recurring problem-solving (explanation + artifacts: step-by-step,
--            examples, use cases, checklist, worksheet, training module, podcast
--            topic, consulting asset, FounderOS feature). Turns her natural
--            intelligence into reusable IP that helps others; feeds the Legacy
--            Archive. Implements ADR-0133 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one generated framework. No updated_at, no trigger.
--   - artifacts is the jsonb array of FrameworkArtifact; strength (0..1) drives IP
--     value.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists taught_frameworks (
  id             uuid              primary key default gen_random_uuid(),
  tenant_id      uuid              not null,
  name           text              not null,
  problem_type   text              not null,
  explanation    text              not null,
  artifacts      jsonb             not null default '[]'::jsonb,
  strength       double precision  not null default 0.5 check (strength >= 0 and strength <= 1),
  created_at     timestamptz       not null default now()
);

create index if not exists taught_frameworks_tenant_created_idx
  on taught_frameworks (tenant_id, created_at);

alter table taught_frameworks enable row level security;

create policy taught_frameworks_select on taught_frameworks
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy taught_frameworks_insert on taught_frameworks
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0206_build_packets.sql >>>>>
-- =============================================================================
-- Migration: 0206_build_packets.sql
-- Purpose:   Stand up the Build Packet Generator — a single `build_packets` table
--            storing the structured packet a coding agent can implement without
--            Alyssa repeating herself: what/why, user problem, business value, the
--            15 Architect-to-Builder artifacts, the Build-Packet-Generator extras,
--            and the build triage. Implements ADR-0135 on the tenant-scoped
--            platform.
--
-- MODEL
--   - MUTABLE: a packet moves draft -> in_review -> approved -> sent -> archived,
--     so the table carries updated_at + set_updated_at(). status constrained by a
--     CHECK mirrored from BuildPacketStatusSchema.
--   - Large artifact fields are text; list/structured fields are jsonb.
--   - awaiting_approval defaults true — nothing is built from a draft.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists build_packets (
  id                         uuid          primary key default gen_random_uuid(),
  tenant_id                  uuid          not null,
  working_name               text          not null default '',
  status                     text          not null default 'draft' check (status in (
                                             'draft','in_review','approved','sent','archived')),
  what_we_are_building       text          not null default '',
  why_we_are_building_it     text          not null default '',
  user_problem               text          not null default '',
  business_value             text          not null default '',
  executive_summary          text          not null default '',
  prd                        text          not null default '',
  user_stories               jsonb         not null default '[]'::jsonb,
  technical_architecture     text          not null default '',
  database_schema            text          not null default '',
  supabase_table_plan        text          not null default '',
  api_routes                 jsonb         not null default '[]'::jsonb,
  frontend_components        jsonb         not null default '[]'::jsonb,
  agent_requirements         jsonb         not null default '[]'::jsonb,
  security_requirements      jsonb         not null default '[]'::jsonb,
  approval_rules             jsonb         not null default '[]'::jsonb,
  implementation_sequence    jsonb         not null default '[]'::jsonb,
  testing_plan               text          not null default '',
  deployment_plan            text          not null default '',
  coding_agent_build_prompt  text          not null default '',
  required_screens           jsonb         not null default '[]'::jsonb,
  required_backend           jsonb         not null default '[]'::jsonb,
  required_database_tables   jsonb         not null default '[]'::jsonb,
  required_integrations      jsonb         not null default '[]'::jsonb,
  risks                      jsonb         not null default '[]'::jsonb,
  assumptions                jsonb         not null default '[]'::jsonb,
  acceptance_criteria        jsonb         not null default '[]'::jsonb,
  launch_checklist           jsonb         not null default '[]'::jsonb,
  triage                     jsonb         not null default '{}'::jsonb,
  awaiting_approval          boolean       not null default true,
  created_at                 timestamptz   not null default now(),
  updated_at                 timestamptz   not null default now()
);

create index if not exists build_packets_tenant_status_idx on build_packets (tenant_id, status);

drop trigger if exists set_updated_at_build_packets on build_packets;
create trigger set_updated_at_build_packets
  before update on build_packets
  for each row execute function set_updated_at();

alter table build_packets enable row level security;

create policy build_packets_select on build_packets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy build_packets_insert on build_packets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy build_packets_update on build_packets
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0207_code_handoffs.sql >>>>>
-- =============================================================================
-- Migration: 0207_code_handoffs.sql
-- Purpose:   Stand up Code Execution Handoff — a single `code_handoffs` table that
--            stores the plan a coding agent needs for one APPROVED Build Packet:
--            branch plan, file plan, implementation prompt, acceptance criteria,
--            tests, rollback plan, security checks, migration plan, Supabase config,
--            deployment checklist. Implements ADR-0136 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is the handoff plan as generated. No updated_at, no
--     trigger. References its build_packet (build_packet_id).
--   - production_requires_approval pinned true (DB CHECK): build is permitted, but
--     merge/deploy/production needs Alyssa's approval.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists code_handoffs (
  id                            uuid          primary key default gen_random_uuid(),
  tenant_id                     uuid          not null,
  build_packet_id               uuid          not null,
  branch_plan                   text          not null,
  file_plan                     jsonb         not null default '[]'::jsonb,
  implementation_prompt         text          not null default '',
  acceptance_criteria           jsonb         not null default '[]'::jsonb,
  tests                         jsonb         not null default '[]'::jsonb,
  rollback_plan                 text          not null default '',
  security_checks               jsonb         not null default '[]'::jsonb,
  database_migration_plan       text          not null default '',
  supabase_configuration        text          not null default '',
  deployment_checklist          jsonb         not null default '[]'::jsonb,
  production_requires_approval  boolean       not null default true check (production_requires_approval = true),
  created_at                    timestamptz   not null default now()
);

create index if not exists code_handoffs_tenant_created_idx on code_handoffs (tenant_id, created_at);
create index if not exists code_handoffs_packet_idx on code_handoffs (build_packet_id);

alter table code_handoffs enable row level security;

create policy code_handoffs_select on code_handoffs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy code_handoffs_insert on code_handoffs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0208_implementation_reviews.sql >>>>>
-- =============================================================================
-- Migration: 0208_implementation_reviews.sql
-- Purpose:   Stand up the Implementation Review Agent — a single
--            `implementation_reviews` table storing the post-build review of a
--            coding agent's work across eight dimensions, the verdict
--            (approve / needs_revision / reject), risks found, and recommended
--            fixes. Implements ADR-0137 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one review. No updated_at, no trigger. May reference
--     the build_packet and the handoff.
--   - verdict constrained by a CHECK mirrored from ImplementationVerdictSchema.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists implementation_reviews (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  build_packet_id    uuid          null,
  handoff_id         uuid          null,
  checks             jsonb         not null default '[]'::jsonb,
  verdict            text          not null check (verdict in ('approve','needs_revision','reject')),
  risks_found        jsonb         not null default '[]'::jsonb,
  recommended_fixes  jsonb         not null default '[]'::jsonb,
  created_at         timestamptz   not null default now()
);

create index if not exists implementation_reviews_tenant_created_idx
  on implementation_reviews (tenant_id, created_at);

alter table implementation_reviews enable row level security;

create policy implementation_reviews_select on implementation_reviews
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy implementation_reviews_insert on implementation_reviews
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0209_ship_gate_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0209_ship_gate_evaluations.sql
-- Purpose:   Stand up the Ship Gate — a single `ship_gate_evaluations` table that
--            records each gate run: the eight checks (requirement, security,
--            permission, database, test, documentation, rollback, approval), the
--            verdict (ready_to_ship / needs_review / do_not_ship), and the blocking
--            checks. Alyssa must approve final shipping. Implements ADR-0138 on the
--            tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one evaluation. No updated_at, no trigger.
--   - verdict constrained by a CHECK mirrored from ShipVerdictSchema.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists ship_gate_evaluations (
  id                uuid          primary key default gen_random_uuid(),
  tenant_id         uuid          not null,
  build_packet_id   uuid          null,
  checks            jsonb         not null default '[]'::jsonb,
  verdict           text          not null check (verdict in ('ready_to_ship','needs_review','do_not_ship')),
  blocking          jsonb         not null default '[]'::jsonb,
  created_at        timestamptz   not null default now()
);

create index if not exists ship_gate_evaluations_tenant_created_idx
  on ship_gate_evaluations (tenant_id, created_at);

alter table ship_gate_evaluations enable row level security;

create policy ship_gate_evaluations_select on ship_gate_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ship_gate_evaluations_insert on ship_gate_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0210_conversation_to_code_runs.sql >>>>>
-- =============================================================================
-- Migration: 0210_conversation_to_code_runs.sql
-- Purpose:   Stand up the Conversation-to-Code Pipeline — a single
--            `conversation_to_code_runs` table tracking one idea's journey through
--            12 stages (conversation -> ... -> compounding_asset). Every build
--            feeds the Compounding Engine. Implements ADR-0141 on the tenant-scoped
--            platform.
--
-- MODEL
--   - MUTABLE: a run advances stage by stage, so the table carries updated_at +
--     set_updated_at(). current_stage constrained by a CHECK mirrored from
--     PipelineStageSchema; per-stage status lives in the `stages` jsonb.
--   - feeds_compounding_engine pinned true (DB CHECK). awaiting_approval defaults
--     true — no deployment without approval.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists conversation_to_code_runs (
  id                          uuid          primary key default gen_random_uuid(),
  tenant_id                   uuid          not null,
  idea                        text          not null,
  working_name                text          not null default '',
  current_stage               text          not null default 'conversation' check (current_stage in (
                                              'conversation','structured_spec','build_packet','security_review',
                                              'code_agent_handoff','implementation','review','testing','approval',
                                              'deployment','documentation','compounding_asset')),
  stages                      jsonb         not null default '[]'::jsonb,
  build_packet_id             uuid          null,
  feeds_compounding_engine    boolean       not null default true check (feeds_compounding_engine = true),
  awaiting_approval           boolean       not null default true,
  created_at                  timestamptz   not null default now(),
  updated_at                  timestamptz   not null default now()
);

create index if not exists conversation_to_code_runs_tenant_created_idx
  on conversation_to_code_runs (tenant_id, created_at);

drop trigger if exists set_updated_at_conversation_to_code_runs on conversation_to_code_runs;
create trigger set_updated_at_conversation_to_code_runs
  before update on conversation_to_code_runs
  for each row execute function set_updated_at();

alter table conversation_to_code_runs enable row level security;

create policy conversation_to_code_runs_select on conversation_to_code_runs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy conversation_to_code_runs_insert on conversation_to_code_runs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy conversation_to_code_runs_update on conversation_to_code_runs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0211_divini_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0211_divini_evaluations.sql
-- Purpose:   Stand up the Divini Standard — a single `divini_evaluations` table
--            scoring a proposal across 14 criteria into a Divini Score and a
--            recommendation (proceed / redesign / reject), plus the two headline
--            checks (billion-dollar-worthy, proud-in-ten-years). The quality
--            benchmark for everything entering the ecosystem. Implements ADR-0142
--            on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one evaluation. No updated_at, no trigger.
--   - recommendation constrained by a CHECK mirrored from DiviniRecommendationSchema.
--     Per-criterion scores live in the `criteria` jsonb.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists divini_evaluations (
  id                     uuid              primary key default gen_random_uuid(),
  tenant_id              uuid              not null,
  subject                text              not null,
  subject_kind           text              not null default 'feature',
  criteria               jsonb             not null default '[]'::jsonb,
  divini_score           double precision  not null default 0 check (divini_score >= 0 and divini_score <= 1),
  recommendation         text              not null check (recommendation in ('proceed','redesign','reject')),
  billion_dollar_worthy  boolean           not null default false,
  proud_in_ten_years     boolean           not null default false,
  reason                 text              not null,
  created_at             timestamptz       not null default now()
);

create index if not exists divini_evaluations_tenant_created_idx
  on divini_evaluations (tenant_id, created_at);

alter table divini_evaluations enable row level security;

create policy divini_evaluations_select on divini_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy divini_evaluations_insert on divini_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0212_infrastructure_plans.sql >>>>>
-- =============================================================================
-- Migration: 0212_infrastructure_plans.sql
-- Purpose:   Stand up the Infrastructure Launch Engine — a single
--            `infrastructure_plans` table that, for one approved build, prepares
--            the whole technical infrastructure (per-provider components, required
--            env vars, manual steps, launch checklist) so Alyssa only adds secrets,
--            approves, and presses launch. Implements ADR-0143 on the tenant-scoped
--            platform.
--
-- MODEL
--   - MUTABLE: prepared_pct and component statuses change as Alyssa supplies
--     secrets, so the table carries updated_at + set_updated_at().
--   - never_blocks_on_secrets pinned true (DB CHECK): preparation never halts on a
--     missing secret.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists infrastructure_plans (
  id                       uuid              primary key default gen_random_uuid(),
  tenant_id                uuid              not null,
  build_packet_id          uuid              not null,
  components               jsonb             not null default '[]'::jsonb,
  env_required             jsonb             not null default '[]'::jsonb,
  manual_steps             jsonb             not null default '[]'::jsonb,
  launch_checklist         jsonb             not null default '[]'::jsonb,
  prepared_pct             double precision  not null default 0 check (prepared_pct >= 0 and prepared_pct <= 1),
  blocking_items           jsonb             not null default '[]'::jsonb,
  never_blocks_on_secrets  boolean           not null default true check (never_blocks_on_secrets = true),
  created_at               timestamptz       not null default now(),
  updated_at               timestamptz       not null default now()
);

create index if not exists infrastructure_plans_tenant_created_idx on infrastructure_plans (tenant_id, created_at);
create index if not exists infrastructure_plans_packet_idx on infrastructure_plans (build_packet_id);

drop trigger if exists set_updated_at_infrastructure_plans on infrastructure_plans;
create trigger set_updated_at_infrastructure_plans
  before update on infrastructure_plans
  for each row execute function set_updated_at();

alter table infrastructure_plans enable row level security;

create policy infrastructure_plans_select on infrastructure_plans
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy infrastructure_plans_insert on infrastructure_plans
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy infrastructure_plans_update on infrastructure_plans
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0213_press_live_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0213_press_live_evaluations.sql
-- Purpose:   Stand up Press Live Mode — a single `press_live_evaluations` table
--            recording each launch run: the pre-launch checks (each carrying, when
--            failed, the exact missing item + where to get it + where to paste it),
--            the outcome (ready_to_launch / blocked_by_secrets / blocked_by_config /
--            blocked_by_test_failure / live), and the blocking checks. Implements
--            ADR-0144 on the tenant-scoped platform.
--
-- MODEL
--   - APPEND-ONLY: each row is one Press Live run. No updated_at, no trigger.
--   - outcome constrained by a CHECK mirrored from PressLiveOutcomeSchema.
--
-- RLS: deny-by-default; SELECT + INSERT only (immutable). No UPDATE/DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists press_live_evaluations (
  id                uuid          primary key default gen_random_uuid(),
  tenant_id         uuid          not null,
  build_packet_id   uuid          null,
  checks            jsonb         not null default '[]'::jsonb,
  outcome           text          not null check (outcome in (
                                    'ready_to_launch','blocked_by_secrets','blocked_by_config',
                                    'blocked_by_test_failure','live')),
  blocking          jsonb         not null default '[]'::jsonb,
  created_at        timestamptz   not null default now()
);

create index if not exists press_live_evaluations_tenant_created_idx
  on press_live_evaluations (tenant_id, created_at);

alter table press_live_evaluations enable row level security;

create policy press_live_evaluations_select on press_live_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy press_live_evaluations_insert on press_live_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0214_human_touch_items.sql >>>>>
-- =============================================================================
-- Migration: 0214_human_touch_items.sql
-- Purpose:   Stand up the Human Touch Queue — a single `human_touch_items` table
--            that logs each required Alyssa-only action (with why, steps,
--            copy/paste value, and risk) so the build never stops on a permission,
--            secret, login, or approval, and all human work batches into one
--            session. Implements ADR-0145 on the tenant-scoped platform.
--
-- MODEL
--   - MUTABLE: an item moves pending -> done / skipped, so the table carries
--     updated_at + set_updated_at(). category, risk_level, and status are
--     CHECK-constrained, mirrored from the contract.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists human_touch_items (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  category           text          not null check (category in (
                                      'approve','paste_secret','login','allow_permission','verify_domain',
                                      'click_button','run_terminal_command','review_legal_money_security',
                                      'final_launch_approval')),
  title              text          not null,
  why                text          not null default '',
  steps              jsonb         not null default '[]'::jsonb,
  copy_paste_value   text          null,
  risk_level         text          not null default 'low' check (risk_level in ('low','medium','high')),
  status             text          not null default 'pending' check (status in ('pending','done','skipped')),
  build_ref          text          null,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);

create index if not exists human_touch_items_tenant_status_idx on human_touch_items (tenant_id, status);

drop trigger if exists set_updated_at_human_touch_items on human_touch_items;
create trigger set_updated_at_human_touch_items
  before update on human_touch_items
  for each row execute function set_updated_at();

alter table human_touch_items enable row level security;

create policy human_touch_items_select on human_touch_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy human_touch_items_insert on human_touch_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy human_touch_items_update on human_touch_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0215_access_grants_memory.sql >>>>>
-- =============================================================================
-- Migration: 0215_access_grants_memory.sql
-- Purpose:   Stand up Permission Memory & Reuse — a single `access_grants_memory`
--            table remembering which tools, folders, accounts, and workspaces
--            already have approved access (with scope, grant/expiry dates, risk,
--            renewal trigger, last verified) so Alfy² reuses access instead of
--            re-asking, escalating only when expired / revoked / risky / changed.
--            Implements ADR-0146 on the tenant-scoped platform. (Named
--            access_grants_memory to avoid the tenancy `grants` and security
--            `permission_groups` tables.)
--
-- MODEL
--   - MUTABLE: status + last_verified_at change over time, so the table carries
--     updated_at + set_updated_at(). status + risk_level CHECK-constrained.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists access_grants_memory (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  tool               text          not null,
  workspace          text          not null default '',
  folder_path        text          not null default '',
  account            text          not null default '',
  scope              text          not null default '',
  granted_at         timestamptz   not null default now(),
  expires_at         timestamptz   null,
  risk_level         text          not null default 'low' check (risk_level in ('low','medium','high')),
  renewal_trigger    text          not null default '',
  last_verified_at   timestamptz   null,
  status             text          not null default 'active' check (status in ('active','expired','revoked')),
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);

create index if not exists access_grants_memory_tenant_tool_idx on access_grants_memory (tenant_id, tool);

drop trigger if exists set_updated_at_access_grants_memory on access_grants_memory;
create trigger set_updated_at_access_grants_memory
  before update on access_grants_memory
  for each row execute function set_updated_at();

alter table access_grants_memory enable row level security;

create policy access_grants_memory_select on access_grants_memory
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy access_grants_memory_insert on access_grants_memory
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy access_grants_memory_update on access_grants_memory
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0216_batched_setups.sql >>>>>
-- =============================================================================
-- Migration: 0216_batched_setups.sql
-- Purpose:   Stand up the Batch Once Engine — a single `batched_setups` table that
--            groups a repeated setup pattern into a do-once sprint: grouped tasks,
--            a one-time checklist, the manual explanation, exact copy/paste values,
--            recorded locations, verification, and the SOP it becomes for reuse.
--            Implements ADR-0147 on the tenant-scoped platform.
--
-- MODEL
--   - MUTABLE: a setup moves queued -> in_progress -> verified -> reusable, so the
--     table carries updated_at + set_updated_at(). pattern + status CHECK-constrained.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists batched_setups (
  id                   uuid          primary key default gen_random_uuid(),
  tenant_id            uuid          not null,
  pattern              text          not null check (pattern in (
                                        'api_keys','secrets','env_vars','dns_records','domain_verification',
                                        'github_setup','supabase_setup','render_setup','resend_setup',
                                        'stripe_setup','social_accounts','brand_assets','intro_outro_uploads',
                                        'email_template_approvals','workflow_approvals')),
  business_context     text          not null default '',
  grouped_tasks        jsonb         not null default '[]'::jsonb,
  one_time_checklist   jsonb         not null default '[]'::jsonb,
  manual_explanation   text          not null default '',
  copy_paste_values    jsonb         not null default '[]'::jsonb,
  recorded_locations   jsonb         not null default '[]'::jsonb,
  verified             boolean       not null default false,
  sop_ref              text          null,
  reusable             boolean       not null default false,
  status               text          not null default 'queued' check (status in (
                                        'queued','in_progress','verified','reusable')),
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

create index if not exists batched_setups_tenant_pattern_idx on batched_setups (tenant_id, pattern);

drop trigger if exists set_updated_at_batched_setups on batched_setups;
create trigger set_updated_at_batched_setups
  before update on batched_setups
  for each row execute function set_updated_at();

alter table batched_setups enable row level security;

create policy batched_setups_select on batched_setups
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy batched_setups_insert on batched_setups
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy batched_setups_update on batched_setups
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0217_future_me_assessments.sql >>>>>
-- =============================================================================
-- Migration: 0217_future_me_assessments.sql
-- Purpose:   Stand up the Future Me Engine — a single `future_me_assessments`
--            table recording, for one decision, the six future-facing signals, the
--            regret risk, the verdict (future_alyssa_thanks_you / mixed /
--            future_alyssa_regrets), and a better path when Future Alyssa would
--            regret it. Implements ADR-0148 on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY (point-in-time assessment). verdict CHECK-constrained.
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists future_me_assessments (
  id            uuid              primary key default gen_random_uuid(),
  tenant_id     uuid              not null,
  decision      text              not null,
  signals       jsonb             not null default '{}'::jsonb,
  regret_risk   double precision  not null default 0 check (regret_risk >= 0 and regret_risk <= 1),
  verdict       text              not null check (verdict in (
                                    'future_alyssa_thanks_you','mixed','future_alyssa_regrets')),
  better_path   text              null,
  reason        text              not null,
  created_at    timestamptz       not null default now()
);

create index if not exists future_me_assessments_tenant_created_idx
  on future_me_assessments (tenant_id, created_at);

alter table future_me_assessments enable row level security;

create policy future_me_assessments_select on future_me_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy future_me_assessments_insert on future_me_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0218_optionality_assessments.sql >>>>>
-- =============================================================================
-- Migration: 0218_optionality_assessments.sql
-- Purpose:   Stand up the Optionality Engine — a single `optionality_assessments`
--            table recording, for one decision, the per-path optionality verdicts
--            and the recommended path (greatest long-term optionality; on an EV
--            tie, the path preserving the most choices). Implements ADR-0149 on the
--            tenant-scoped platform.
--
-- MODEL: APPEND-ONLY (point-in-time assessment).
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists optionality_assessments (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  decision           text          not null,
  verdicts           jsonb         not null default '[]'::jsonb,
  recommended_path   text          not null,
  reason             text          not null,
  created_at         timestamptz   not null default now()
);

create index if not exists optionality_assessments_tenant_created_idx
  on optionality_assessments (tenant_id, created_at);

alter table optionality_assessments enable row level security;

create policy optionality_assessments_select on optionality_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy optionality_assessments_insert on optionality_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0219_thought_partner_responses.sql >>>>>
-- =============================================================================
-- Migration: 0219_thought_partner_responses.sql
-- Purpose:   Stand up the Executive Thought Partner — a single
--            `thought_partner_responses` table recording each response: stance
--            (challenge / support / compare_options / refine_execution), challenged
--            assumptions, blind spots, alternatives, risks, tradeoffs, honest
--            uncertainty, and the reasoning behind the stance. Implements ADR-0150
--            on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY. stance CHECK-constrained. reasoning is always present
--   (the partner never just agrees or rejects).
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists thought_partner_responses (
  id                      uuid          primary key default gen_random_uuid(),
  tenant_id               uuid          not null,
  proposition             text          not null,
  stance                  text          not null check (stance in (
                                          'challenge','support','compare_options','refine_execution')),
  challenged_assumptions  jsonb         not null default '[]'::jsonb,
  blind_spots             jsonb         not null default '[]'::jsonb,
  alternatives            jsonb         not null default '[]'::jsonb,
  risks                   jsonb         not null default '[]'::jsonb,
  tradeoffs               jsonb         not null default '[]'::jsonb,
  uncertain               boolean       not null default false,
  reasoning               text          not null,
  created_at              timestamptz   not null default now()
);

create index if not exists thought_partner_responses_tenant_created_idx
  on thought_partner_responses (tenant_id, created_at);

alter table thought_partner_responses enable row level security;

create policy thought_partner_responses_select on thought_partner_responses
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy thought_partner_responses_insert on thought_partner_responses
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0220_capability_reports.sql >>>>>
-- =============================================================================
-- Migration: 0220_capability_reports.sql
-- Purpose:   Stand up the Capability Monitor — a single `capability_reports` table
--            recording, for one newly-available capability, the seven impact
--            signals, the business impact, suggested implementation, migration
--            plan, and priority (now / soon / watch / ignore). Implements ADR-0151
--            on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY. priority CHECK-constrained.
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists capability_reports (
  id                       uuid          primary key default gen_random_uuid(),
  tenant_id                uuid          not null,
  capability               text          not null,
  source                   text          not null default '',
  impact                   jsonb         not null default '{}'::jsonb,
  business_impact          text          not null,
  suggested_implementation text          not null default '',
  migration_plan           jsonb         not null default '[]'::jsonb,
  priority                 text          not null check (priority in ('now','soon','watch','ignore')),
  created_at               timestamptz   not null default now()
);

create index if not exists capability_reports_tenant_created_idx
  on capability_reports (tenant_id, created_at);

alter table capability_reports enable row level security;

create policy capability_reports_select on capability_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy capability_reports_insert on capability_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0221_stack_evaluations.sql >>>>>
-- =============================================================================
-- Migration: 0221_stack_evaluations.sql
-- Purpose:   Stand up the Tech Stack Evaluator — a single `stack_evaluations`
--            table recording, for one stack component, the signals, the
--            disposition (upgrade / replace / wait / experiment / ignore), and
--            whether there is a measurable benefit (change is never recommended on
--            novelty alone). Implements ADR-0152 on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY. category + disposition CHECK-constrained.
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists stack_evaluations (
  id                       uuid          primary key default gen_random_uuid(),
  tenant_id                uuid          not null,
  component                text          not null,
  category                 text          not null check (category in (
                                           'ai_model','coding_model','voice_model','image_model','video_model',
                                           'search','github','supabase','render','resend','stripe','slack',
                                           'google_workspace','apple_ecosystem','microsoft_ecosystem',
                                           'security_tool','open_source')),
  signals                  jsonb         not null default '{}'::jsonb,
  disposition              text          not null check (disposition in (
                                           'upgrade','replace','wait','experiment','ignore')),
  has_measurable_benefit   boolean       not null default false,
  reason                   text          not null,
  created_at               timestamptz   not null default now()
);

create index if not exists stack_evaluations_tenant_created_idx
  on stack_evaluations (tenant_id, created_at);

alter table stack_evaluations enable row level security;

create policy stack_evaluations_select on stack_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy stack_evaluations_insert on stack_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0222_reuse_assessments.sql >>>>>
-- =============================================================================
-- Migration: 0222_reuse_assessments.sql
-- Purpose:   Stand up Build Once, Reuse Everywhere — a single `reuse_assessments`
--            table recording, for one built module, whether it should be packaged
--            for reuse, which targets could reuse it, and the reusable forms to
--            package it as (component / workflow / agent / schema / prompt /
--            playbook). Implements ADR-0153 on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY. targets + package_as are jsonb arrays (enum-validated in
--   the contract / engine).
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists reuse_assessments (
  id            uuid          primary key default gen_random_uuid(),
  tenant_id     uuid          not null,
  module        text          not null,
  reusable      boolean       not null default false,
  targets       jsonb         not null default '[]'::jsonb,
  package_as    jsonb         not null default '[]'::jsonb,
  reason        text          not null,
  created_at    timestamptz   not null default now()
);

create index if not exists reuse_assessments_tenant_created_idx
  on reuse_assessments (tenant_id, created_at);

alter table reuse_assessments enable row level security;

create policy reuse_assessments_select on reuse_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy reuse_assessments_insert on reuse_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- >>>>> 0223_connections.sql >>>>>
-- =============================================================================
-- Migration: 0223_connections.sql
-- Purpose:   Stand up the Connections layer — the "Set up & Connect" surface.
--            Two tables:
--              1. `connector_definitions` — the extensible catalog of WHAT can be
--                 connected (provider, category, auth_kind, required secret keys).
--                 New platforms are registered here at runtime; no enum change.
--              2. `connections` — an actual connection at a SCOPE (master /
--                 business / personal), each with its own credentials (secret
--                 references, never values). A business connection overrides the
--                 master; with none, the business inherits the master.
--            Implements ADR-0154 on the tenant-scoped platform. Composes the
--            Connector Registry, Human Touch Queue, Permission Memory, SecretVault.
--
-- MODEL
--   - Both tables are MUTABLE (status / health / catalog edits) → updated_at +
--     set_updated_at().
--   - connections.secret_refs holds REFERENCES into the SecretVault; raw secret
--     values are never stored here.
--   - Uniqueness: one definition per (tenant, provider); one connection per
--     (tenant, provider, scope, business). business_id is normalized via COALESCE
--     so master/personal (null business_id) are unique per provider too.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE
--   (retire a connector via enabled=false; revoke a connection via status).
-- Idempotent where reasonable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- connector_definitions — the extensible catalog of connectable platforms.
-- ---------------------------------------------------------------------------
create table if not exists connector_definitions (
  id                    uuid          primary key default gen_random_uuid(),
  tenant_id             uuid          not null,
  provider              text          not null,
  display_name          text          not null,
  category              text          not null,
  auth_kind             text          not null check (auth_kind in ('oauth2','api_key','webhook','basic','none')),
  required_secret_keys  jsonb         not null default '[]'::jsonb,
  default_scopes        jsonb         not null default '[]'::jsonb,
  risk_level            text          not null default 'low' check (risk_level in ('low','medium','high')),
  docs_url              text          not null default '',
  enabled               boolean       not null default true,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now()
);

create unique index if not exists connector_definitions_tenant_provider_idx
  on connector_definitions (tenant_id, provider);

drop trigger if exists set_updated_at_connector_definitions on connector_definitions;
create trigger set_updated_at_connector_definitions
  before update on connector_definitions
  for each row execute function set_updated_at();

alter table connector_definitions enable row level security;

create policy connector_definitions_select on connector_definitions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy connector_definitions_insert on connector_definitions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy connector_definitions_update on connector_definitions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- connections — a scoped connection instance with its own credentials.
-- ---------------------------------------------------------------------------
create table if not exists connections (
  id                 uuid              primary key default gen_random_uuid(),
  tenant_id          uuid              not null,
  scope              text              not null check (scope in ('master','business','personal')),
  business_id        uuid              null,
  provider           text              not null,
  label              text              not null default '',
  status             text              not null default 'not_connected' check (status in (
                                         'not_connected','pending_setup','connected','error','expired','revoked')),
  granted_scopes     jsonb             not null default '[]'::jsonb,
  secret_refs        jsonb             not null default '[]'::jsonb,
  health             double precision  not null default 0 check (health >= 0 and health <= 1),
  last_verified_at   timestamptz       null,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz       not null default now(),
  -- business scope requires a business_id; master/personal must not have one.
  constraint connections_scope_business_ck check (
    (scope = 'business' and business_id is not null) or
    (scope <> 'business' and business_id is null)
  )
);

create index if not exists connections_tenant_provider_idx on connections (tenant_id, provider);
create index if not exists connections_tenant_business_idx on connections (tenant_id, business_id);
-- One connection per (tenant, provider, scope, business). COALESCE normalizes null business_id.
create unique index if not exists connections_unique_scope_idx
  on connections (tenant_id, provider, scope,
                  coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid));

drop trigger if exists set_updated_at_connections on connections;
create trigger set_updated_at_connections
  before update on connections
  for each row execute function set_updated_at();

alter table connections enable row level security;

create policy connections_select on connections
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy connections_insert on connections
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy connections_update on connections
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

