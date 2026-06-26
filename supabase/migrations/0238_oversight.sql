-- =============================================================================
-- Migration: 0238_oversight.sql
-- Purpose:   Oversight — three cross-cutting quality / visibility gates.
--              1. Leadership Blind-Spot Detector (what leadership can't see) ->
--                 oversight_blind_spots.
--              2. Recursive System Optimizer (same operating questions per layer) ->
--                 oversight_recursive_diagnoses.
--              3. Billion-Dollar Standard Checker (pre-ship quality gate) ->
--                 oversight_billion_dollar_checks.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- All three tables are APPEND-ONLY (SELECT + INSERT only) — an audit trail of what
--   was surfaced / diagnosed / checked.
-- Array fields are jsonb. Enum-like fields are text, validated by the Zod contract
--   (oversight.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Blind spots (append-only) ----------------------------------------------
create table if not exists oversight_blind_spots (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  scope         text        not null,
  blind_spot    text        not null,
  why_matters   text        not null,
  data_needed   text        not null,
  reporting_fix text        not null,
  owner         text        not null,
  cadence       text        not null,
  created_at    timestamptz not null default now()
);

-- ---- Recursive diagnoses (append-only) --------------------------------------
create table if not exists oversight_recursive_diagnoses (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  layer              text        not null,
  subject            text        not null,
  stakeholder        text        not null,
  objective          text        not null,
  first_impression   text        not null,
  trust_gap          text        not null,
  conversion_action  text        not null,
  support_loop       text        not null,
  kpi                text        not null,
  feedback_loop      text        not null,
  retention_loop     text        not null,
  root_failure_point text        not null,
  created_at         timestamptz not null default now()
);

-- ---- Billion-dollar checks (append-only) ------------------------------------
create table if not exists oversight_billion_dollar_checks (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  subject              text        not null,
  investor_grade       boolean     not null,
  client_grade         boolean     not null,
  legal_grade          boolean     not null,
  operator_grade       boolean     not null,
  scales_100x          boolean     not null,
  protects_brand       boolean     not null,
  protects_revenue     boolean     not null,
  protects_trust       boolean     not null,
  reduces_future_chaos boolean     not null,
  passed               boolean     not null,
  revisions_needed     jsonb       not null default '[]'::jsonb,
  created_at           timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists oversight_blind_spots_scope_idx
  on oversight_blind_spots (tenant_id, scope);
create index if not exists oversight_recursive_diagnoses_layer_idx
  on oversight_recursive_diagnoses (tenant_id, layer);
create index if not exists oversight_billion_dollar_checks_passed_idx
  on oversight_billion_dollar_checks (tenant_id, passed);

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies. All tables append-only
-- (SELECT + INSERT only).
-- =============================================================================
alter table oversight_blind_spots             enable row level security;
alter table oversight_recursive_diagnoses     enable row level security;
alter table oversight_billion_dollar_checks   enable row level security;

create policy oversight_blind_spots_select on oversight_blind_spots
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy oversight_blind_spots_insert on oversight_blind_spots
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy oversight_recursive_diagnoses_select on oversight_recursive_diagnoses
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy oversight_recursive_diagnoses_insert on oversight_recursive_diagnoses
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy oversight_billion_dollar_checks_select on oversight_billion_dollar_checks
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy oversight_billion_dollar_checks_insert on oversight_billion_dollar_checks
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
