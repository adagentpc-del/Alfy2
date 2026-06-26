-- =============================================================================
-- Migration: 0243_capital_allocation.sql
-- Purpose:   Stand up the Capital Allocation Engine (Profit-First) — Operations
--            Architecture §34. Three tables back the engine:
--              - capital_accounts   (MUTABLE) — one row per bucket per business:
--                the allocation policy (target_pct) + current balance. The nine
--                buckets are operating|taxes|owner_pay|reserve|growth|tools|
--                contractors|legal|investment.
--              - capital_allocations (APPEND-ONLY) — each row is a RECOMMENDED
--                split of one inflow across the buckets (split jsonb {bucket:amount}).
--              - capital_runway     (APPEND-ONLY) — each row is a cash/burn reading
--                with derived runway_days + mode (profit_first|growth|emergency).
--
-- HARD RULE (Constitution / Part I §13): Alfie NEVER moves money. Every allocation
--   is recommended=true, approved=false; the transfer is surfaced for the founder to
--   approve and execute. This schema only records recommendations — it executes nothing.
--
-- MODEL
--   - capital_accounts is MUTABLE (balances + policy upsert) → updated_at + the
--     shared set_updated_at() trigger (from 0001) + SELECT/INSERT/UPDATE policies.
--     Unique (tenant_id, business_id, bucket) is the upsert key.
--   - capital_allocations / capital_runway are APPEND-ONLY: no updated_at, no
--     trigger, no UPDATE — SELECT + INSERT only.
--   - split is jsonb. Enum-like fields (bucket, mode) are text, validated by the
--     Zod contract (capital-allocation.ts) + Pydantic mirror.
--
-- Tenancy: tenant_id on every row; RLS deny-by-default with policies scoped via
--          current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Capital accounts (mutable) ---------------------------------------------
create table if not exists capital_accounts (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  business_id uuid        not null,
  bucket      text        not null,
  target_pct  numeric     not null,
  balance     numeric     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create unique index if not exists capital_accounts_tenant_business_bucket_idx
  on capital_accounts (tenant_id, business_id, bucket);

-- updated_at trigger (mutable table; set_updated_at() from 0001).
drop trigger if exists set_updated_at_capital_accounts on capital_accounts;
create trigger set_updated_at_capital_accounts
  before update on capital_accounts for each row execute function set_updated_at();

-- ---- Capital allocations (append-only) --------------------------------------
create table if not exists capital_allocations (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  business_id uuid        not null,
  inflow_usd  numeric     not null,
  split       jsonb       not null default '{}'::jsonb,
  mode        text        not null,
  recommended boolean     not null default true,
  approved    boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists capital_allocations_tenant_business_created_idx
  on capital_allocations (tenant_id, business_id, created_at desc);

-- ---- Capital runway (append-only) -------------------------------------------
create table if not exists capital_runway (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  business_id      uuid        not null,
  as_of            timestamptz not null,
  cash_usd         numeric     not null,
  monthly_burn_usd numeric     not null,
  runway_days      int         not null,
  min_reserve_usd  numeric     not null,
  mode             text        not null,
  created_at       timestamptz not null default now()
);

create index if not exists capital_runway_tenant_business_as_of_idx
  on capital_runway (tenant_id, business_id, as_of desc);

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
--   capital_accounts:    SELECT + INSERT + UPDATE (mutable).
--   capital_allocations: SELECT + INSERT only (append-only / immutable).
--   capital_runway:      SELECT + INSERT only (append-only / immutable).
-- =============================================================================
alter table capital_accounts    enable row level security;
alter table capital_allocations enable row level security;
alter table capital_runway      enable row level security;

create policy capital_accounts_select on capital_accounts
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy capital_accounts_insert on capital_accounts
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy capital_accounts_update on capital_accounts
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy capital_allocations_select on capital_allocations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy capital_allocations_insert on capital_allocations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy capital_runway_select on capital_runway
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy capital_runway_insert on capital_runway
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
