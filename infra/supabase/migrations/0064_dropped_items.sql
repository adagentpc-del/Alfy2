-- =============================================================================
-- Migration: 0064_dropped_items.sql
-- Purpose:   Stand up the Alfy² "Don't Drop the Ball" System — a single
--            `dropped_items` table that tracks the things slipping through the
--            cracks across the operator's businesses. Implements the Don't Drop
--            the Ball System on top of the tenant-scoped platform.
--
-- DON'T DROP THE BALL MODEL
--   - The engine detects items that have gone past their per-kind staleness
--     thresholds and surfaces them so nothing is silently dropped:
--       forgotten_lead, missed_follow_up, unfinished_launch, abandoned_idea,
--       stale_campaign, unpaid_invoice, unsigned_contract, open_loop,
--       waiting_on_response.
--   - Detected items are surfaced DAILY for the operator to review. Each item
--     carries the business it belongs to, how long it has been sitting
--     (`age_days`), the dollars at stake (`value_usd`), and the engine's
--     `recommended_action` to close the loop.
--   - An item moves through a lifecycle:
--       open → assigned → closed (or dismissed).
--   - Once APPROVED, an agent is assigned (`assigned_agent`) to close the loop —
--     the item flips to 'assigned' and the agent drives it to 'closed'.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0065_dropped_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- dropped_items — a forgotten lead, missed follow-up, unfinished launch,
-- abandoned idea, stale campaign, unpaid invoice, unsigned contract, open loop,
-- or waiting-on response that has gone past its per-kind staleness threshold.
-- Detected daily, scoped to a business, scored by age and value, and carrying a
-- recommended action. Moves open → assigned → closed (or dismissed); once
-- approved an agent is assigned to close the loop. Mutable.
-- -----------------------------------------------------------------------------
create table if not exists dropped_items (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  kind                text              not null
                                        check (kind in (
                                          'forgotten_lead','missed_follow_up',
                                          'unfinished_launch','abandoned_idea',
                                          'stale_campaign','unpaid_invoice',
                                          'unsigned_contract','open_loop',
                                          'waiting_on_response')),
  title               text              not null,
  business_id         uuid,
  business_name       text              not null default '',
  age_days            integer           not null default 0,
  value_usd           double precision  not null default 0,
  status              text              not null default 'open'
                                        check (status in (
                                          'open','assigned','closed','dismissed')),
  assigned_agent      text,
  recommended_action  text              not null default '',
  detected_at         timestamptz       not null default now(),
  updated_at          timestamptz
);

create index if not exists dropped_items_tenant_status_idx
  on dropped_items (tenant_id, status);

create index if not exists dropped_items_tenant_kind_idx
  on dropped_items (tenant_id, kind);

-- -----------------------------------------------------------------------------
-- updated_at trigger for dropped_items. Reuses set_updated_at() from 0001 (do
-- NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_dropped_items on dropped_items;
create trigger set_updated_at_dropped_items
  before update on dropped_items
  for each row execute function set_updated_at();
