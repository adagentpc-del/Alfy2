-- =============================================================================
-- Migration: 0062_queue_items.sql
-- Purpose:   Stand up the Alfy² Execution Queue — a single `queue_items` table
--            that captures everything competing for the operator's attention so
--            the system always knows what to do next. Implements the Execution
--            Queue on top of the tenant-scoped platform.
--
-- EXECUTION QUEUE MODEL
--   - Every item lands in one of 8 BUCKETS:
--       idea, task, approved_action, blocked_action, waiting_on_alyssa,
--       automated_workflow, money_action, risk_action.
--   - Every item carries one of 7 PRIORITY CATEGORIES, ordered highest → lowest:
--       revenue > risk > deadline > follow_up > operations > personal_admin
--       > nice_to_have.
--   - `value_usd` and `due` let the engine rank within a category; `actionable`
--     marks whether the item can be worked now, and `done` closes it out.
--   - The queue is mutable: items are created, re-bucketed, re-prioritized, and
--     completed over time, so `updated_at` is maintained by the shared trigger.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in 0063_queue_items_rls.sql.
-- This file only defines structure; it does NOT enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- queue_items — a single thing competing for the operator's attention, sorted
-- into one of 8 buckets and one of 7 priority categories. Carries value, due
-- date, and actionable/done flags so the engine always knows what to do next.
-- Mutable: items are re-bucketed, re-prioritized, and completed over time.
-- -----------------------------------------------------------------------------
create table if not exists queue_items (
  id           uuid              primary key default gen_random_uuid(),
  tenant_id    uuid              not null,
  bucket       text              not null
                                 check (bucket in (
                                   'idea','task','approved_action','blocked_action',
                                   'waiting_on_alyssa','automated_workflow',
                                   'money_action','risk_action')),
  category     text              not null
                                 check (category in (
                                   'revenue','risk','deadline','follow_up',
                                   'operations','personal_admin','nice_to_have')),
  title        text              not null,
  business_id  uuid,
  value_usd    double precision  not null default 0,
  due          timestamptz,
  actionable   boolean           not null default true,
  done         boolean           not null default false,
  created_at   timestamptz       not null default now(),
  updated_at   timestamptz
);

create index if not exists queue_items_tenant_bucket_idx
  on queue_items (tenant_id, bucket);

create index if not exists queue_items_tenant_category_idx
  on queue_items (tenant_id, category);

create index if not exists queue_items_tenant_done_idx
  on queue_items (tenant_id, done);

-- -----------------------------------------------------------------------------
-- updated_at trigger for queue_items. Reuses set_updated_at() from 0001 (do NOT
-- redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_queue_items on queue_items;
create trigger set_updated_at_queue_items
  before update on queue_items
  for each row execute function set_updated_at();
