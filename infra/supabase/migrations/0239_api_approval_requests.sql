-- =============================================================================
-- Migration: 0239_api_approval_requests.sql
-- Purpose:   The central API Approval Gate the runtime enforces. Persists every
--            gated action request (send_message / publish_public / move_money /
--            charge / deploy / delete_data / send_contract / change_pricing /
--            change_access / change_standing_rule / medical_legal_financial_claim
--            / other) with its risk band, gating decision, and the operator's
--            decision (approved / denied / expired). Only internal_action is exempt.
--
-- Tenancy:   tenant_id on every row; RLS deny-by-default with policies scoped via
--            current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable table (status/decision advance) → updated_at + the shared
--   set_updated_at() trigger (from 0001) + SELECT/INSERT/UPDATE policies.
-- payload is jsonb. Enum-like fields are text, validated by the Zod contract
--   (api-approval.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Approval requests (mutable) --------------------------------------------
create table if not exists api_approval_requests (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  business_id       uuid,
  action_class      text        not null,
  method            text        not null,
  route             text        not null,
  summary           text        not null default '',
  payload           jsonb       not null default '{}'::jsonb,
  risk              text        not null,
  requires_approval boolean     not null default true,
  status            text        not null default 'pending',
  requested_by      text        not null default '',
  decided_by        text,
  decision_reason   text        not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  decided_at        timestamptz
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists api_approval_requests_tenant_status_idx
  on api_approval_requests (tenant_id, status);

-- ---- updated_at trigger (mutable table; set_updated_at() from 0001) ----------
drop trigger if exists set_updated_at_api_approval_requests on api_approval_requests;
create trigger set_updated_at_api_approval_requests
  before update on api_approval_requests for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies (SELECT + INSERT + UPDATE).
-- =============================================================================
alter table api_approval_requests enable row level security;

create policy api_approval_requests_select on api_approval_requests
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy api_approval_requests_insert on api_approval_requests
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy api_approval_requests_update on api_approval_requests
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
