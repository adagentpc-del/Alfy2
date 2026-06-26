-- =============================================================================
-- Migration: 0228_revenue_command.sql
-- Purpose:   CRO / Revenue Command — the Chief Revenue Officer brain over the
--            whole portfolio. Orchestration / decision layer (does NOT re-implement
--            deal desk / conversion engines). Persists scored revenue opportunities,
--            top money actions for the command center, per-business funnel snapshots,
--            daily command-center snapshots, per-business revenue missions, and
--            pre-send offer/pricing reviews.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable tables (opportunities, money_actions, business_missions) get updated_at +
--   the shared set_updated_at() trigger (from 0001) + UPDATE policy. Append-only
--   tables (funnel_stages, command_centers, offer_reviews) are SELECT + INSERT only.
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (revenue-command.ts) + Pydantic mirror.
-- Tables prefixed `revenue_` to avoid clashing with the existing live tables.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Revenue opportunities (mutable) ----------------------------------------
create table if not exists revenue_opportunities (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  business             text        not null,
  kind                 text        not null,
  title                text        not null,
  description          text        not null default '',
  expected_revenue_usd double precision not null default 0,
  speed_to_cash_days   double precision not null default 0,
  effort               text        not null default 'medium',
  risk                 text        not null default 'low',
  confidence           double precision not null default 0.5,
  founder_time_hours   double precision not null default 0,
  strategic_value      text        not null default 'medium',
  repeatability        text        not null default 'one_time',
  margin               text        not null default 'medium',
  probability_of_close double precision not null default 0.5,
  score                double precision not null default 0,
  status               text        not null default 'nurture',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

-- ---- Money actions (mutable) ------------------------------------------------
create table if not exists revenue_money_actions (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  opportunity_id       uuid,
  business             text        not null,
  action               text        not null,
  rationale            text        not null default '',
  expected_revenue_usd double precision not null default 0,
  due                  text,
  assigned_agent       text,
  approval_required    boolean     not null default false,
  status               text        not null default 'todo',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

-- ---- Funnel stage snapshots (append-only) -----------------------------------
create table if not exists revenue_funnel_stages (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  business           text        not null,
  stage              text        not null,
  health             text        not null default 'healthy',
  notes              text        not null default '',
  recommended_action text        not null default '',
  created_at         timestamptz not null default now()
);

-- ---- Command centers (append-only daily snapshot) ---------------------------
create table if not exists revenue_command_centers (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  date                 text        not null,
  top_money_actions    jsonb       not null default '[]'::jsonb,
  hottest_leads        jsonb       not null default '[]'::jsonb,
  proposals_due        jsonb       not null default '[]'::jsonb,
  followups_due        jsonb       not null default '[]'::jsonb,
  payment_links_needed jsonb       not null default '[]'::jsonb,
  stalled_deals        jsonb       not null default '[]'::jsonb,
  top_platform_users   jsonb       not null default '[]'::jsonb,
  fastest_partnerships jsonb       not null default '[]'::jsonb,
  revenue_blockers     jsonb       not null default '[]'::jsonb,
  cash_forecast_usd    double precision,
  created_at           timestamptz not null default now()
);

-- ---- Business revenue missions (mutable) ------------------------------------
create table if not exists revenue_business_missions (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  business    text        not null,
  objectives  jsonb       not null default '[]'::jsonb,
  tactics     jsonb       not null default '[]'::jsonb,
  kpis        jsonb       not null default '[]'::jsonb,
  status      text        not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

-- ---- Offer reviews (append-only) --------------------------------------------
create table if not exists revenue_offer_reviews (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  business              text        not null,
  offer_name            text        not null,
  price_usd             double precision not null default 0,
  flags                 jsonb       not null default '[]'::jsonb,
  recommended_price_usd double precision,
  verdict               text        not null default 'send',
  notes                 text        not null default '',
  created_at            timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists revenue_opportunities_tenant_idx     on revenue_opportunities (tenant_id, status, score);
create index if not exists revenue_opportunities_business_idx   on revenue_opportunities (tenant_id, business);
create index if not exists revenue_money_actions_tenant_idx     on revenue_money_actions (tenant_id, status);
create index if not exists revenue_money_actions_opp_idx        on revenue_money_actions (tenant_id, opportunity_id);
create index if not exists revenue_funnel_stages_tenant_idx     on revenue_funnel_stages (tenant_id, business, stage);
create index if not exists revenue_command_centers_tenant_idx   on revenue_command_centers (tenant_id, date);
create index if not exists revenue_business_missions_tenant_idx on revenue_business_missions (tenant_id, business);
create index if not exists revenue_offer_reviews_tenant_idx     on revenue_offer_reviews (tenant_id, business);

-- ---- updated_at triggers (mutable tables; set_updated_at() from 0001) --------
drop trigger if exists set_updated_at_revenue_opportunities on revenue_opportunities;
create trigger set_updated_at_revenue_opportunities
  before update on revenue_opportunities for each row execute function set_updated_at();

drop trigger if exists set_updated_at_revenue_money_actions on revenue_money_actions;
create trigger set_updated_at_revenue_money_actions
  before update on revenue_money_actions for each row execute function set_updated_at();

drop trigger if exists set_updated_at_revenue_business_missions on revenue_business_missions;
create trigger set_updated_at_revenue_business_missions
  before update on revenue_business_missions for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table revenue_opportunities      enable row level security;
alter table revenue_money_actions      enable row level security;
alter table revenue_funnel_stages      enable row level security;
alter table revenue_command_centers    enable row level security;
alter table revenue_business_missions  enable row level security;
alter table revenue_offer_reviews      enable row level security;

-- Mutable: SELECT + INSERT + UPDATE.
create policy revenue_opportunities_select on revenue_opportunities
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_opportunities_insert on revenue_opportunities
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_opportunities_update on revenue_opportunities
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy revenue_money_actions_select on revenue_money_actions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_money_actions_insert on revenue_money_actions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_money_actions_update on revenue_money_actions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy revenue_business_missions_select on revenue_business_missions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_business_missions_insert on revenue_business_missions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_business_missions_update on revenue_business_missions
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only.
create policy revenue_funnel_stages_select on revenue_funnel_stages
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_funnel_stages_insert on revenue_funnel_stages
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy revenue_command_centers_select on revenue_command_centers
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_command_centers_insert on revenue_command_centers
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy revenue_offer_reviews_select on revenue_offer_reviews
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy revenue_offer_reviews_insert on revenue_offer_reviews
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
