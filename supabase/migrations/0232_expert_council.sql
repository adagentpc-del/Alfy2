-- =============================================================================
-- Migration: 0232_expert_council.sql
-- Purpose:   Expert Knowledge Council + Framework Library.
--            A private advisory board of elite operators. Persists a framework
--            library of de-personalized principles (expert_frameworks), and the
--            applications of those lenses: lens applications, principle
--            conversions, and advisory board reviews.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable table (expert_frameworks) gets updated_at + the shared set_updated_at()
--   trigger (from 0001) + UPDATE policy. The application/review/conversion tables
--   are append-only (SELECT + INSERT only).
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (expert-council.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Expert frameworks (mutable) --------------------------------------------
create table if not exists expert_frameworks (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  expert                text        not null,
  discipline            text        not null,
  source                text        not null default '',
  principle             text        not null,
  framework_name        text        not null,
  best_use_case         text        not null default '',
  bad_use_case          text        not null default '',
  misuse_risk           text        not null default '',
  adapted_for_alyssa    text        not null default '',
  business_applications jsonb       not null default '[]'::jsonb,
  implementation_steps  jsonb       not null default '[]'::jsonb,
  kpi                   text        not null default '',
  confidence            double precision not null default 0.5,
  test_status           text        not null default 'untested',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

-- ---- Lens applications (append-only) ----------------------------------------
create table if not exists expert_lens_applications (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  objective       text        not null,
  business_key    text        not null default '',
  selected_lenses jsonb       not null default '[]'::jsonb,
  recommendations jsonb       not null default '[]'::jsonb,
  conflicts       jsonb       not null default '[]'::jsonb,
  chosen_strategy text        not null default '',
  execution_steps jsonb       not null default '[]'::jsonb,
  kpis            jsonb       not null default '[]'::jsonb,
  approval_needed boolean     not null default false,
  created_at      timestamptz not null default now()
);

-- ---- Principle conversions (append-only) ------------------------------------
create table if not exists expert_principle_conversions (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  principle        text        not null,
  businesses       jsonb       not null default '[]'::jsonb,
  departments      jsonb       not null default '[]'::jsonb,
  agents           jsonb       not null default '[]'::jsonb,
  templates_needed jsonb       not null default '[]'::jsonb,
  sops_needed      jsonb       not null default '[]'::jsonb,
  campaign_use     text        not null default '',
  product_use      text        not null default '',
  kpi              text        not null default '',
  recommended_test text        not null default '',
  created_at       timestamptz not null default now()
);

-- ---- Advisory board reviews (append-only) -----------------------------------
create table if not exists expert_advisory_reviews (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  decision              text        not null,
  lenses_run            jsonb       not null default '[]'::jsonb,
  tradeoffs             jsonb       not null default '[]'::jsonb,
  decision_required     text        not null default '',
  fastest_safe_next_step text       not null default '',
  created_at            timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists expert_frameworks_tenant_idx            on expert_frameworks (tenant_id, discipline);
create index if not exists expert_frameworks_status_idx            on expert_frameworks (tenant_id, test_status);
create index if not exists expert_lens_applications_tenant_idx     on expert_lens_applications (tenant_id, business_key);
create index if not exists expert_principle_conversions_tenant_idx on expert_principle_conversions (tenant_id, created_at);
create index if not exists expert_advisory_reviews_tenant_idx      on expert_advisory_reviews (tenant_id, created_at);

-- ---- updated_at trigger (mutable table; set_updated_at() from 0001) ----------
drop trigger if exists set_updated_at_expert_frameworks on expert_frameworks;
create trigger set_updated_at_expert_frameworks
  before update on expert_frameworks for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table expert_frameworks            enable row level security;
alter table expert_lens_applications      enable row level security;
alter table expert_principle_conversions  enable row level security;
alter table expert_advisory_reviews       enable row level security;

-- Mutable: SELECT + INSERT + UPDATE (expert_frameworks).
create policy expert_frameworks_select on expert_frameworks
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy expert_frameworks_insert on expert_frameworks
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy expert_frameworks_update on expert_frameworks
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only.
create policy expert_lens_applications_select on expert_lens_applications
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy expert_lens_applications_insert on expert_lens_applications
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy expert_principle_conversions_select on expert_principle_conversions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy expert_principle_conversions_insert on expert_principle_conversions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy expert_advisory_reviews_select on expert_advisory_reviews
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy expert_advisory_reviews_insert on expert_advisory_reviews
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
