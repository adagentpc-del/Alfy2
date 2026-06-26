-- =============================================================================
-- Migration: 0214_human_touch_items.sql
-- Purpose:   Stand up the Human Touch Queue — a single `human_touch_items` table
--            that logs each required Alyssa-only action (with why, steps,
--            copy/paste value, and risk) so the build never stops on a permission,
--            secret, login, or approval, and all human work batches into one
--            session. Implements ADR-0145 on the tenant-scoped platform.
--
-- MODEL
--   - MUTABLE: an item moves pending -> done / skipped, so the table carries
--     updated_at + set_updated_at(). category, risk_level, and status are
--     CHECK-constrained, mirrored from the contract.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists human_touch_items (
  id                 uuid          primary key default gen_random_uuid(),
  tenant_id          uuid          not null,
  category           text          not null check (category in (
                                      'approve','paste_secret','login','allow_permission','verify_domain',
                                      'click_button','run_terminal_command','review_legal_money_security',
                                      'final_launch_approval')),
  title              text          not null,
  why                text          not null default '',
  steps              jsonb         not null default '[]'::jsonb,
  copy_paste_value   text          null,
  risk_level         text          not null default 'low' check (risk_level in ('low','medium','high')),
  status             text          not null default 'pending' check (status in ('pending','done','skipped')),
  build_ref          text          null,
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);

create index if not exists human_touch_items_tenant_status_idx on human_touch_items (tenant_id, status);

drop trigger if exists set_updated_at_human_touch_items on human_touch_items;
create trigger set_updated_at_human_touch_items
  before update on human_touch_items
  for each row execute function set_updated_at();

alter table human_touch_items enable row level security;

create policy human_touch_items_select on human_touch_items
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy human_touch_items_insert on human_touch_items
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy human_touch_items_update on human_touch_items
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
