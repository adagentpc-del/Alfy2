-- =============================================================================
-- Migration: 0226_department_os.sql
-- Purpose:   Department Operating System + AI Employee KPI / Scorecard.
--            Organizes AI agents like departments in a billion-dollar operating
--            company. Persists departments (with operating loops + KPIs), AI
--            employee scorecards, and append-only KPI records that link every
--            KPI to a business outcome.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable tables (departments, ai_employees) get updated_at + the shared
--   set_updated_at() trigger (from 0001) + UPDATE policy. KPI records are
--   append-only (SELECT + INSERT only).
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (department-os.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Departments (mutable) --------------------------------------------------
create table if not exists department_os_departments (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  key             text        not null,
  name            text        not null,
  mission         text        not null default '',
  operating_loop  jsonb       not null default '[]'::jsonb,
  responsibilities jsonb      not null default '[]'::jsonb,
  inputs          jsonb       not null default '[]'::jsonb,
  outputs         jsonb       not null default '[]'::jsonb,
  kpis            jsonb       not null default '[]'::jsonb,
  review_cadence  text        not null default 'weekly',
  approval_rules  jsonb       not null default '[]'::jsonb,
  escalation_rules jsonb      not null default '[]'::jsonb,
  failure_signals jsonb       not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

-- ---- AI employees / scorecards (mutable) ------------------------------------
create table if not exists department_os_ai_employees (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  department_key        text        not null,
  name                  text        not null,
  mission               text        not null default '',
  businesses_used_by    jsonb       not null default '[]'::jsonb,
  allowed_actions       jsonb       not null default '[]'::jsonb,
  requires_approval_for jsonb       not null default '[]'::jsonb,
  inputs                jsonb       not null default '[]'::jsonb,
  outputs               jsonb       not null default '[]'::jsonb,
  tools_integrations    jsonb       not null default '[]'::jsonb,
  risk_level            text        not null default 'low',
  kpis                  jsonb       not null default '[]'::jsonb,
  metrics               jsonb       not null default '{}'::jsonb,
  review_cadence        text        not null default 'weekly',
  status                text        not null default 'active',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

-- ---- KPI records (append-only) ----------------------------------------------
create table if not exists department_os_kpi_records (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  owner_kind       text        not null,
  owner_key        text        not null,
  kpi_name         text        not null,
  value            double precision not null,
  period           text        not null,
  business_outcome text        not null,
  created_at       timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists department_os_departments_tenant_idx   on department_os_departments (tenant_id, key);
create index if not exists department_os_ai_employees_dept_idx     on department_os_ai_employees (tenant_id, department_key);
create index if not exists department_os_kpi_records_owner_idx      on department_os_kpi_records (tenant_id, owner_kind, owner_key);

-- ---- updated_at triggers (mutable tables; set_updated_at() from 0001) --------
drop trigger if exists set_updated_at_department_os_departments on department_os_departments;
create trigger set_updated_at_department_os_departments
  before update on department_os_departments for each row execute function set_updated_at();

drop trigger if exists set_updated_at_department_os_ai_employees on department_os_ai_employees;
create trigger set_updated_at_department_os_ai_employees
  before update on department_os_ai_employees for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table department_os_departments  enable row level security;
alter table department_os_ai_employees  enable row level security;
alter table department_os_kpi_records   enable row level security;

-- Mutable: SELECT + INSERT + UPDATE (departments, ai_employees).
create policy department_os_departments_select on department_os_departments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy department_os_departments_insert on department_os_departments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy department_os_departments_update on department_os_departments
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy department_os_ai_employees_select on department_os_ai_employees
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy department_os_ai_employees_insert on department_os_ai_employees
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy department_os_ai_employees_update on department_os_ai_employees
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only.
create policy department_os_kpi_records_select on department_os_kpi_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy department_os_kpi_records_insert on department_os_kpi_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
