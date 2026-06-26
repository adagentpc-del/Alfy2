-- =============================================================================
-- Migration: 0230_business_profile.sql
-- Purpose:   Business Operating Profile + Context Stack.
--            Powers BUSINESS-AWARE EXECUTION ("same global skill, different
--            business execution"). Each business gets a rich operating profile
--            (business_profiles, mutable); every agent assembles a business-scoped
--            context stack (business_context_stacks, append-only snapshot) that
--            NEVER mixes two businesses' contexts.
--
-- Relation:  references a business by string business_key. Distinct from the
--            existing `businesses` structural table — do NOT clash with it.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable table (business_profiles) gets updated_at + the shared set_updated_at()
--   trigger (from 0001) + UPDATE policy. Context stacks are append-only
--   snapshots (SELECT + INSERT only).
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (business-profile.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Business operating profiles (mutable) ----------------------------------
create table if not exists business_profiles (
  id                      uuid        primary key default gen_random_uuid(),
  tenant_id               uuid        not null,
  business_key            text        not null,
  tier                    text        not null default 'tier_1',
  identity                text        not null default '',
  mission                 text        not null default '',
  revenue_model           text        not null default '',
  offers                  jsonb       not null default '[]'::jsonb,
  pricing_notes           text        not null default '',
  target_audiences        jsonb       not null default '[]'::jsonb,
  brand_voice             text        not null default '',
  approved_language       jsonb       not null default '[]'::jsonb,
  banned_language         jsonb       not null default '[]'::jsonb,
  growth_channels         jsonb       not null default '[]'::jsonb,
  platform_connections    jsonb       not null default '[]'::jsonb,
  source_of_truth_systems jsonb       not null default '[]'::jsonb,
  active_campaigns        jsonb       not null default '[]'::jsonb,
  current_priorities      jsonb       not null default '[]'::jsonb,
  compliance_risks        jsonb       not null default '[]'::jsonb,
  compliance_caution      text        not null default '',
  ai_skills_used          jsonb       not null default '[]'::jsonb,
  kpis                    jsonb       not null default '[]'::jsonb,
  improvement_backlog     jsonb       not null default '[]'::jsonb,
  status                  text        not null default 'active',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz
);

-- ---- Business context stacks (append-only snapshots) ------------------------
create table if not exists business_context_stacks (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  business_key       text        not null,
  task               text        not null,
  layers             jsonb       not null default '[]'::jsonb,
  brand_voice        text        not null default '',
  banned_language    jsonb       not null default '[]'::jsonb,
  compliance_caution text        not null default '',
  created_at         timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
-- One operating profile per (tenant, business_key) — enforces idempotent upsert.
create unique index if not exists business_profiles_tenant_key_uidx
  on business_profiles (tenant_id, business_key);
create index if not exists business_context_stacks_tenant_key_idx
  on business_context_stacks (tenant_id, business_key);

-- ---- updated_at trigger (mutable table; set_updated_at() from 0001) ----------
drop trigger if exists set_updated_at_business_profiles on business_profiles;
create trigger set_updated_at_business_profiles
  before update on business_profiles for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table business_profiles        enable row level security;
alter table business_context_stacks  enable row level security;

-- Mutable: SELECT + INSERT + UPDATE (business_profiles).
create policy business_profiles_select on business_profiles
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy business_profiles_insert on business_profiles
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy business_profiles_update on business_profiles
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only (business_context_stacks).
create policy business_context_stacks_select on business_context_stacks
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy business_context_stacks_insert on business_context_stacks
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
