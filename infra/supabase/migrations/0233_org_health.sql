-- =============================================================================
-- Migration: 0233_org_health.sql
-- Purpose:   Org Health / CODO — Chief Organizational Development Officer brain.
--            Persists append-only AI-employee wellness snapshots, agent-to-agent
--            communication audits, agent corrections (train, don't replace),
--            org-health reports, and monthly CEO coaching reports for Alyssa.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- All five tables are append-only (SELECT + INSERT only) — they are immutable
--   records of organizational health over time.
-- Array fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (org-health.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Agent wellness snapshots (append-only) ---------------------------------
create table if not exists org_health_wellness (
  id                uuid             primary key default gen_random_uuid(),
  tenant_id         uuid             not null,
  agent             text             not null,
  workload          integer          not null,
  waiting_tasks     integer          not null,
  avg_response_ms   double precision not null,
  approval_delay_ms double precision not null,
  failure_rate      double precision not null,
  handoff_success   double precision not null,
  context_size      integer          not null,
  cost_per_run      double precision not null,
  token_efficiency  double precision not null,
  overloaded        boolean          not null,
  recommendation    text             not null,
  created_at        timestamptz      not null default now()
);

-- ---- Communication audits (append-only) -------------------------------------
create table if not exists org_health_comm_audits (
  id                    uuid             primary key default gen_random_uuid(),
  tenant_id             uuid             not null,
  from_agent            text             not null,
  to_agent              text             not null,
  packet_id             uuid,
  clarity               double precision not null,
  completeness          double precision not null,
  context               double precision not null,
  resource_availability double precision not null,
  ambiguity             double precision not null,
  handoff_quality       double precision not null,
  business_awareness    double precision not null,
  goal_awareness        double precision not null,
  kpi_awareness         double precision not null,
  approval_awareness    double precision not null,
  score                 double precision not null,
  issues                jsonb            not null default '[]'::jsonb,
  created_at            timestamptz      not null default now()
);

-- ---- Agent corrections (append-only) — train, don't replace -----------------
create table if not exists org_health_corrections (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  agent             text        not null,
  failure_diagnosis text        not null,
  updates_made      jsonb       not null default '[]'::jsonb,
  notes             text        not null default '',
  created_at        timestamptz not null default now()
);

-- ---- Org health reports (append-only) ---------------------------------------
create table if not exists org_health_reports (
  id                   uuid             primary key default gen_random_uuid(),
  tenant_id            uuid             not null,
  period               text             not null,
  org_health_score     double precision not null,
  bottlenecks          jsonb            not null default '[]'::jsonb,
  overloaded_agents    jsonb            not null default '[]'::jsonb,
  underutilized_agents jsonb            not null default '[]'::jsonb,
  approval_delays      jsonb            not null default '[]'::jsonb,
  repeated_mistakes    jsonb            not null default '[]'::jsonb,
  outdated_sops        jsonb            not null default '[]'::jsonb,
  recommendations      jsonb            not null default '[]'::jsonb,
  created_at           timestamptz      not null default now()
);

-- ---- CEO coaching reports (append-only) -------------------------------------
create table if not exists org_health_ceo_coaching (
  id                           uuid        primary key default gen_random_uuid(),
  tenant_id                    uuid        not null,
  period                       text        not null,
  too_much_time_on             jsonb       not null default '[]'::jsonb,
  only_alyssa_can_do           jsonb       not null default '[]'::jsonb,
  ai_should_own                jsonb       not null default '[]'::jsonb,
  humans_should_own            jsonb       not null default '[]'::jsonb,
  should_disappear             jsonb       not null default '[]'::jsonb,
  decision_fatigue_points      jsonb       not null default '[]'::jsonb,
  perfectionism_points         jsonb       not null default '[]'::jsonb,
  missed_opportunities         jsonb       not null default '[]'::jsonb,
  leverage_increased           jsonb       not null default '[]'::jsonb,
  leverage_decreased           jsonb       not null default '[]'::jsonb,
  founder_health_indicators    jsonb       not null default '[]'::jsonb,
  recommended_focus_next_month jsonb       not null default '[]'::jsonb,
  created_at                   timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists org_health_wellness_agent_idx      on org_health_wellness (tenant_id, agent);
create index if not exists org_health_comm_audits_agents_idx  on org_health_comm_audits (tenant_id, from_agent, to_agent);
create index if not exists org_health_corrections_agent_idx   on org_health_corrections (tenant_id, agent);
create index if not exists org_health_reports_period_idx      on org_health_reports (tenant_id, period);
create index if not exists org_health_ceo_coaching_period_idx on org_health_ceo_coaching (tenant_id, period);

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies. All tables are append-only
-- (SELECT + INSERT only).
-- =============================================================================
alter table org_health_wellness      enable row level security;
alter table org_health_comm_audits   enable row level security;
alter table org_health_corrections   enable row level security;
alter table org_health_reports       enable row level security;
alter table org_health_ceo_coaching  enable row level security;

create policy org_health_wellness_select on org_health_wellness
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy org_health_wellness_insert on org_health_wellness
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy org_health_comm_audits_select on org_health_comm_audits
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy org_health_comm_audits_insert on org_health_comm_audits
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy org_health_corrections_select on org_health_corrections
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy org_health_corrections_insert on org_health_corrections
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy org_health_reports_select on org_health_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy org_health_reports_insert on org_health_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy org_health_ceo_coaching_select on org_health_ceo_coaching
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy org_health_ceo_coaching_insert on org_health_ceo_coaching
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
