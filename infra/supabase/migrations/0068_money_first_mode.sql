-- =============================================================================
-- Migration: 0068_money_first_mode.sql
-- Purpose:   Stand up the Alfy² Money-First Operating Mode — a single
--            `money_first_mode` table that holds one mode-state row per tenant.
--            Implements Money-First Operating Mode on top of the tenant-scoped
--            platform.
--
-- MONEY-FIRST OPERATING MODE
--   When ACTIVE, Alfy² prioritizes ONLY cash-moving activities:
--       cash collection, sales, follow-up, booked calls, proposals, invoices,
--       high-conversion content, warm relationships, low-friction offers.
--   And DEPRIORITIZES everything that does not move money:
--       perfection, branding polish, unnecessary features, low-conversion ideas,
--       and research without action.
--
--   - One mode-state row per tenant (unique on tenant_id). `active` toggles the
--     mode on/off; `activated_at` stamps when the mode was last switched on.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural/state snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0069_money_first_mode_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- money_first_mode — the Money-First Operating Mode state for a tenant. One row
-- per tenant (unique on tenant_id). When `active`, Alfy² prioritizes only
-- cash-moving activities and deprioritizes perfection, polish, unnecessary
-- features, low-conversion ideas, and research without action. `activated_at`
-- stamps when the mode was last switched on. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists money_first_mode (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  active        boolean     not null default false,
  activated_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (tenant_id)
);

-- -----------------------------------------------------------------------------
-- updated_at trigger for money_first_mode. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_money_first_mode on money_first_mode;
create trigger set_updated_at_money_first_mode
  before update on money_first_mode
  for each row execute function set_updated_at();
