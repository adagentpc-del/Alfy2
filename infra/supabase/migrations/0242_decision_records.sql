-- =============================================================================
-- Migration: 0242_decision_records.sql
-- Purpose:   The Advisory Decision Engine / Advisory Council record (§35.2). One row
--            per high-impact decision evaluated through the 13 principle-based lenses:
--            summary, risks, upside, downside, assumptions, reversibility, required
--            data, per-lens analysis, recommendation, and the approval gate. One-way
--            -door (irreversible) decisions always require approval.
--
-- Tenancy:   tenant_id on every row; RLS deny-by-default with policies scoped via
--            current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable table (status/decision advance) → updated_at + the shared
--   set_updated_at() trigger (from 0001) + SELECT/INSERT/UPDATE policies.
-- Arrays (risks/assumptions/required_data) and lens_analysis are jsonb. Enum-like
--   fields are text, validated by the Zod contract (decision-record.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Decision records (mutable) ---------------------------------------------
create table if not exists decision_records (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  business_id       uuid,
  title             text        not null,
  summary           text        not null default '',
  decision_type     text        not null,
  risks             jsonb       not null default '[]'::jsonb,
  upside            text        not null default '',
  downside          text        not null default '',
  assumptions       jsonb       not null default '[]'::jsonb,
  reversibility     text        not null,
  required_data     jsonb       not null default '[]'::jsonb,
  lens_analysis     jsonb       not null default '[]'::jsonb,
  recommendation    text        not null default '',
  approval_required boolean     not null default true,
  status            text        not null default 'open',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  decided_at        timestamptz
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists decision_records_tenant_status_idx
  on decision_records (tenant_id, status);

-- ---- updated_at trigger (mutable table; set_updated_at() from 0001) ----------
drop trigger if exists set_updated_at_decision_records on decision_records;
create trigger set_updated_at_decision_records
  before update on decision_records for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies (SELECT + INSERT + UPDATE).
-- =============================================================================
alter table decision_records enable row level security;

create policy decision_records_select on decision_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy decision_records_insert on decision_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy decision_records_update on decision_records
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
