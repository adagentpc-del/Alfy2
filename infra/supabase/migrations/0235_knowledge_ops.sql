-- =============================================================================
-- Migration: 0235_knowledge_ops.sql
-- Purpose:   Knowledge Ops — turn public elite-expert knowledge into a structured,
--            tested, business-specific operating library (NOT a quote library).
--            Sits on top of the Expert Knowledge Council. Persists a source library
--            + pipeline, the weekly Elite Operator Digest (surface only likely-
--            leverage), the Alyssa Adaptation Filter, knowledge governance taxonomy,
--            the scenario simulator, and the experiment + learning repository.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable tables (knowops_sources, knowops_experiments) get updated_at + the shared
--   set_updated_at() trigger (from 0001) + UPDATE policy. The digest, adaptation
--   filters, taxonomy and scenarios are append-only (SELECT + INSERT only).
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (knowledge-ops.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Source library (mutable — moves through the pipeline) ------------------
create table if not exists knowops_sources (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  source_name           text        not null,
  expert                text        not null default '',
  kind                  text        not null,
  url_ref               text        not null default '',
  date_added            text        not null default '',
  summarized            boolean     not null default false,
  principles_extracted  boolean     not null default false,
  mapped_to_businesses  boolean     not null default false,
  tested                boolean     not null default false,
  status                text        not null default 'added',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

-- ---- Elite Operator Digest items (append-only) ------------------------------
create table if not exists knowops_digest_items (
  id                      uuid        primary key default gen_random_uuid(),
  tenant_id               uuid        not null,
  week                    text        not null,
  source                  text        not null default '',
  principle               text        not null,
  why_it_matters          text        not null default '',
  business_it_applies_to  text        not null default '',
  recommended_test        text        not null default '',
  effort                  text        not null default 'medium',
  upside                  text        not null default 'medium',
  risk                    text        not null default 'medium',
  surfaced                boolean     not null default false,
  created_at              timestamptz not null default now()
);

-- ---- Alyssa Adaptation Filter results (append-only) -------------------------
create table if not exists knowops_adaptation_filters (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  principle         text        not null,
  business_key      text        not null,
  fits_model        boolean     not null default false,
  fits_brand        boolean     not null default false,
  fits_energy       boolean     not null default false,
  protects_trust    boolean     not null default false,
  creates_leverage  boolean     not null default false,
  risks_generic     boolean     not null default false,
  too_manual        boolean     not null default false,
  ai_automatable    boolean     not null default false,
  cheaply_testable  boolean     not null default false,
  passed            boolean     not null default false,
  recommendation    text        not null default '',
  created_at        timestamptz not null default now()
);

-- ---- Knowledge governance taxonomy (append-only) ----------------------------
create table if not exists knowops_taxonomy (
  id                        uuid             primary key default gen_random_uuid(),
  tenant_id                 uuid             not null,
  insight                   text             not null,
  discipline                text             not null,
  business_function         text             not null default '',
  funnel_stage              text             not null default '',
  company_stage             text             not null,
  business_model            text             not null,
  audience_type             text             not null default '',
  risk_level                text             not null default 'medium',
  implementation_difficulty text             not null default 'medium',
  expected_roi              text             not null default 'medium',
  confidence                double precision not null default 0.5,
  source_quality            text             not null default 'medium',
  freshness                 text             not null default '',
  created_at                timestamptz      not null default now()
);

-- ---- Scenario simulations (append-only) -------------------------------------
create table if not exists knowops_scenarios (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  strategy      text        not null,
  business_key  text        not null,
  scenarios     jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- ---- Experiment + learning repository (mutable) -----------------------------
create table if not exists knowops_experiments (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  hypothesis         text        not null,
  business_key       text        not null,
  audience           text        not null default '',
  asset              text        not null default '',
  channel            text        not null default '',
  timeline           text        not null default '',
  expected_result    text        not null default '',
  kpi                text        not null default '',
  success_threshold  text        not null default '',
  failure_threshold  text        not null default '',
  next_if_works      text        not null default '',
  next_if_fails      text        not null default '',
  status             text        not null default 'untested',
  result_notes       text        not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists knowops_sources_tenant_idx            on knowops_sources (tenant_id, status);
create index if not exists knowops_digest_items_week_idx         on knowops_digest_items (tenant_id, week);
create index if not exists knowops_adaptation_filters_biz_idx    on knowops_adaptation_filters (tenant_id, business_key);
create index if not exists knowops_taxonomy_discipline_idx       on knowops_taxonomy (tenant_id, discipline);
create index if not exists knowops_scenarios_biz_idx             on knowops_scenarios (tenant_id, business_key);
create index if not exists knowops_experiments_biz_idx           on knowops_experiments (tenant_id, business_key, status);

-- ---- updated_at triggers (mutable tables; set_updated_at() from 0001) --------
drop trigger if exists set_updated_at_knowops_sources on knowops_sources;
create trigger set_updated_at_knowops_sources
  before update on knowops_sources for each row execute function set_updated_at();

drop trigger if exists set_updated_at_knowops_experiments on knowops_experiments;
create trigger set_updated_at_knowops_experiments
  before update on knowops_experiments for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table knowops_sources             enable row level security;
alter table knowops_digest_items         enable row level security;
alter table knowops_adaptation_filters   enable row level security;
alter table knowops_taxonomy             enable row level security;
alter table knowops_scenarios            enable row level security;
alter table knowops_experiments          enable row level security;

-- Mutable: SELECT + INSERT + UPDATE (sources, experiments).
create policy knowops_sources_select on knowops_sources
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy knowops_sources_insert on knowops_sources
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy knowops_sources_update on knowops_sources
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowops_experiments_select on knowops_experiments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy knowops_experiments_insert on knowops_experiments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy knowops_experiments_update on knowops_experiments
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only.
create policy knowops_digest_items_select on knowops_digest_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy knowops_digest_items_insert on knowops_digest_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowops_adaptation_filters_select on knowops_adaptation_filters
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy knowops_adaptation_filters_insert on knowops_adaptation_filters
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowops_taxonomy_select on knowops_taxonomy
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy knowops_taxonomy_insert on knowops_taxonomy
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy knowops_scenarios_select on knowops_scenarios
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy knowops_scenarios_insert on knowops_scenarios
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
