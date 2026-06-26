-- =============================================================================
-- Migration: 0237_market_intel.sql
-- Purpose:   Market Intelligence — Voice-of-Customer insights, Market Gaps, and
--            AI-Search / public-reputation (AEO) visibility scores. Listens to the
--            real market (pain in the customer's own words), names unmet gaps, and
--            scores AI/search/reputation visibility from weighted signal groups.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- All three tables are APPEND-ONLY (SELECT + INSERT only); no updated_at, no UPDATE
--   policy, no triggers — matching the append-only Zod contract (market-intel.ts).
-- Array fields are jsonb; the AI-visibility signals object is jsonb. Enum-like fields
--   are text, validated by the Zod contract + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Voice-of-Customer insights (append-only) -------------------------------
create table if not exists market_voc_insights (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  business_key          text        not null,
  source                text        not null,
  pain_points           jsonb       not null default '[]'::jsonb,
  customer_language     jsonb       not null default '[]'::jsonb,
  objections            jsonb       not null default '[]'::jsonb,
  desires               jsonb       not null default '[]'::jsonb,
  trust_barriers        jsonb       not null default '[]'::jsonb,
  feature_requests      jsonb       not null default '[]'::jsonb,
  pricing_friction      jsonb       not null default '[]'::jsonb,
  emotional_triggers    jsonb       not null default '[]'::jsonb,
  competitor_complaints jsonb       not null default '[]'::jsonb,
  improves              jsonb       not null default '[]'::jsonb,
  created_at            timestamptz not null default now()
);

-- ---- Market gaps (append-only) ----------------------------------------------
create table if not exists market_gaps (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  market               text        not null,
  gap                  text        not null,
  why_exists           text        not null default '',
  who_feels_it         text        not null default '',
  opportunity          text        not null default '',
  mvp_solution         text        not null default '',
  revenue_model        text        not null default '',
  speed_to_market_plan text        not null default '',
  created_at           timestamptz not null default now()
);

-- ---- AI-Search / reputation visibility scores (append-only) -----------------
create table if not exists market_ai_visibility (
  id                        uuid        primary key default gen_random_uuid(),
  tenant_id                 uuid        not null,
  business_key              text        not null,
  signals                   jsonb       not null default '{}'::jsonb,
  ai_visibility_score       double precision not null,
  search_visibility_score   double precision not null,
  reputation_score          double precision not null,
  missing_entity_signals    jsonb       not null default '[]'::jsonb,
  missing_authority_signals jsonb       not null default '[]'::jsonb,
  missing_proof             jsonb       not null default '[]'::jsonb,
  recommended_content       jsonb       not null default '[]'::jsonb,
  recommended_citations     jsonb       not null default '[]'::jsonb,
  created_at                timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists market_voc_insights_tenant_idx    on market_voc_insights (tenant_id, business_key);
create index if not exists market_gaps_tenant_idx            on market_gaps (tenant_id, market);
create index if not exists market_ai_visibility_tenant_idx   on market_ai_visibility (tenant_id, business_key);

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies. All three tables append-only
-- (SELECT + INSERT only).
-- =============================================================================
alter table market_voc_insights    enable row level security;
alter table market_gaps            enable row level security;
alter table market_ai_visibility   enable row level security;

create policy market_voc_insights_select on market_voc_insights
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy market_voc_insights_insert on market_voc_insights
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy market_gaps_select on market_gaps
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy market_gaps_insert on market_gaps
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy market_ai_visibility_select on market_ai_visibility
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy market_ai_visibility_insert on market_ai_visibility
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
