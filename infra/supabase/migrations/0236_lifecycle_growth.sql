-- =============================================================================
-- Migration: 0236_lifecycle_growth.sql
-- Purpose:   Lifecycle + Growth Architecture.
--            Persists the explicit 8-stage lifecycle per stakeholder, compounding
--            growth loops, trust-asset audits (the trust flywheel), scored
--            first-impression audits, and white-glove journeys.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable tables (lifecycle_maps, growth_loops, white_glove_journeys) get
--   updated_at + the shared set_updated_at() trigger (from 0001) + UPDATE policy.
-- Audit tables (trust_asset_audits, first_impression_audits) are append-only
--   (SELECT + INSERT only).
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (lifecycle-growth.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Lifecycle maps (mutable) -----------------------------------------------
create table if not exists lifecycle_maps (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null,
  business_key text        not null,
  stakeholder  text        not null,
  stages       jsonb       not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

-- ---- Growth loops (mutable) -------------------------------------------------
create table if not exists growth_loops (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  business_key     text        not null,
  name             text        not null,
  kind             text        not null,
  steps            jsonb       not null default '[]'::jsonb,
  improvement_plan text        not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

-- ---- Trust asset audits (append-only) ---------------------------------------
create table if not exists trust_asset_audits (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  business_key        text        not null,
  existing_assets     jsonb       not null default '[]'::jsonb,
  missing_assets      jsonb       not null default '[]'::jsonb,
  easiest_to_create   text        not null default '',
  highest_value_proof text        not null default '',
  trust_blockers      jsonb       not null default '[]'::jsonb,
  reputation_risks    jsonb       not null default '[]'::jsonb,
  next_action         text        not null default '',
  created_at          timestamptz not null default now()
);

-- ---- First impression audits (append-only) ----------------------------------
create table if not exists first_impression_audits (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  business_key        text        not null,
  touchpoint          text        not null,
  sets_expectations   boolean     not null default false,
  reduces_anxiety     boolean     not null default false,
  explains_value      boolean     not null default false,
  attracts_right      boolean     not null default false,
  repels_wrong        boolean     not null default false,
  credible            boolean     not null default false,
  creates_next_action boolean     not null default false,
  matches_brand       boolean     not null default false,
  score               double precision not null,
  recommendations     jsonb       not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

-- ---- White-glove journeys (mutable) -----------------------------------------
create table if not exists white_glove_journeys (
  id           uuid        primary key default gen_random_uuid(),
  tenant_id    uuid        not null,
  business_key text        not null,
  stakeholder  text        not null,
  stages       jsonb       not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists lifecycle_maps_tenant_idx           on lifecycle_maps (tenant_id, business_key);
create index if not exists growth_loops_tenant_idx             on growth_loops (tenant_id, business_key, kind);
create index if not exists trust_asset_audits_tenant_idx       on trust_asset_audits (tenant_id, business_key);
create index if not exists first_impression_audits_tenant_idx  on first_impression_audits (tenant_id, business_key);
create index if not exists white_glove_journeys_tenant_idx     on white_glove_journeys (tenant_id, business_key);

-- ---- updated_at triggers (mutable tables; set_updated_at() from 0001) --------
drop trigger if exists set_updated_at_lifecycle_maps on lifecycle_maps;
create trigger set_updated_at_lifecycle_maps
  before update on lifecycle_maps for each row execute function set_updated_at();

drop trigger if exists set_updated_at_growth_loops on growth_loops;
create trigger set_updated_at_growth_loops
  before update on growth_loops for each row execute function set_updated_at();

drop trigger if exists set_updated_at_white_glove_journeys on white_glove_journeys;
create trigger set_updated_at_white_glove_journeys
  before update on white_glove_journeys for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table lifecycle_maps           enable row level security;
alter table growth_loops             enable row level security;
alter table trust_asset_audits       enable row level security;
alter table first_impression_audits  enable row level security;
alter table white_glove_journeys     enable row level security;

-- Mutable: SELECT + INSERT + UPDATE (lifecycle_maps, growth_loops, white_glove_journeys).
create policy lifecycle_maps_select on lifecycle_maps
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy lifecycle_maps_insert on lifecycle_maps
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy lifecycle_maps_update on lifecycle_maps
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy growth_loops_select on growth_loops
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy growth_loops_insert on growth_loops
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy growth_loops_update on growth_loops
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy white_glove_journeys_select on white_glove_journeys
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy white_glove_journeys_insert on white_glove_journeys
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy white_glove_journeys_update on white_glove_journeys
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only (trust_asset_audits, first_impression_audits).
create policy trust_asset_audits_select on trust_asset_audits
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy trust_asset_audits_insert on trust_asset_audits
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy first_impression_audits_select on first_impression_audits
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy first_impression_audits_insert on first_impression_audits
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
