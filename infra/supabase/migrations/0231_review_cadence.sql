-- =============================================================================
-- Migration: 0231_review_cadence.sql
-- Purpose:   Executive Review Cadence + Master Docs. Runs structured monthly /
--            quarterly / yearly review cycles for each business AND the portfolio.
--            Reviews are management meetings that UPDATE the operating system:
--            collect append-only department reports, assemble a board-quality
--            master document (with the EXACT sections per level + a meeting
--            agenda), then capture Alyssa's feedback (decisions / priorities /
--            tasks / SOP changes / paused-killed / next-review goals).
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable table (review_master_docs) gets updated_at + the shared set_updated_at()
--   trigger (from 0001) + UPDATE policy. Department reports + feedback are
--   append-only (SELECT + INSERT only).
-- Array/object fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (review-cadence.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Master review documents (mutable) --------------------------------------
create table if not exists review_master_docs (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  business_key       text,
  level              text        not null,
  period             text        not null,
  meeting_mode       text        not null,
  executive_summary  text        not null default '',
  sections           jsonb       not null default '[]'::jsonb,
  kpi_tables         jsonb       not null default '[]'::jsonb,
  decisions_needed   jsonb       not null default '[]'::jsonb,
  recommended_actions jsonb      not null default '[]'::jsonb,
  risks              jsonb       not null default '[]'::jsonb,
  priorities         jsonb       not null default '[]'::jsonb,
  data_sources       jsonb       not null default '[]'::jsonb,
  approval_checklist jsonb       not null default '[]'::jsonb,
  follow_up_tasks    jsonb       not null default '[]'::jsonb,
  agenda             jsonb       not null default '[]'::jsonb,
  status             text        not null default 'collecting',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);

-- ---- Department reports (append-only) ---------------------------------------
create table if not exists review_department_reports (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null,
  review_id       uuid        not null,
  department_key  text        not null,
  wins            jsonb       not null default '[]'::jsonb,
  failures        jsonb       not null default '[]'::jsonb,
  kpis            jsonb       not null default '{}'::jsonb,
  risks           jsonb       not null default '[]'::jsonb,
  blockers        jsonb       not null default '[]'::jsonb,
  recommendations jsonb       not null default '[]'::jsonb,
  decisions_needed jsonb      not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

-- ---- Review feedback (append-only — the Alyssa feedback loop) ----------------
create table if not exists review_feedback (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  review_id         uuid        not null,
  decisions         jsonb       not null default '[]'::jsonb,
  updated_priorities jsonb      not null default '[]'::jsonb,
  new_tasks         jsonb       not null default '[]'::jsonb,
  sop_changes       jsonb       not null default '[]'::jsonb,
  paused_or_killed  jsonb       not null default '[]'::jsonb,
  next_review_goals jsonb       not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists review_master_docs_tenant_idx
  on review_master_docs (tenant_id, level, period);
create index if not exists review_master_docs_business_idx
  on review_master_docs (tenant_id, business_key);
create index if not exists review_department_reports_review_idx
  on review_department_reports (tenant_id, review_id);
create index if not exists review_feedback_review_idx
  on review_feedback (tenant_id, review_id);

-- ---- updated_at trigger (mutable table; set_updated_at() from 0001) ----------
drop trigger if exists set_updated_at_review_master_docs on review_master_docs;
create trigger set_updated_at_review_master_docs
  before update on review_master_docs for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table review_master_docs        enable row level security;
alter table review_department_reports  enable row level security;
alter table review_feedback            enable row level security;

-- Mutable: SELECT + INSERT + UPDATE (review_master_docs).
create policy review_master_docs_select on review_master_docs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy review_master_docs_insert on review_master_docs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy review_master_docs_update on review_master_docs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only (review_department_reports).
create policy review_department_reports_select on review_department_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy review_department_reports_insert on review_department_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only (review_feedback).
create policy review_feedback_select on review_feedback
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy review_feedback_insert on review_feedback
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
