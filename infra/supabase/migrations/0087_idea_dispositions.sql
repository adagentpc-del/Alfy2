-- =============================================================================
-- Migration: 0087_idea_dispositions.sql
-- Purpose:   Stand up the Alfy² Idea Disposition capture — a single
--            `idea_dispositions` table that records the Founder Operating
--            Principle: convert speed of thought into speed of execution.
--
-- FOUNDER OPERATING PRINCIPLE
--   - The goal is to convert SPEED OF THOUGHT into SPEED OF EXECUTION.
--   - Every idea is immediately given a disposition — it becomes exactly one of:
--       task         — do it now / schedule it as work.
--       asset        — capture it as a reusable asset.
--       campaign     — turn it into a marketing/outreach campaign.
--       offer        — shape it into a productized offer.
--       agent        — build an agent to run it.
--       workflow     — encode it as a repeatable workflow.
--       parked_idea  — explicitly parked for later (not lost).
--       killed_idea  — explicitly killed (decided against, on the record).
--   - `reason` records WHY the idea was dispositioned the way it was, and
--     `business_id` optionally ties it to one of the operator's businesses.
--   - The point: no idea ever dies silently in notes — every one is captured
--     and routed.
--
-- IMMUTABLE CAPTURE RECORDS
--   - A disposition is a recorded moment of decision. There is intentionally NO
--     updated_at column and NO update trigger: capture rows are not edited in
--     place. They can be discarded (DELETE) but never rewritten.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables (omitted here — immutable capture rows).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0088_idea_dispositions_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- idea_dispositions — one captured idea routed to exactly one disposition
-- (task/asset/campaign/offer/agent/workflow/parked/killed), with the reason for
-- the call and an optional business link. Immutable capture record: no
-- updated_at, no update trigger.
-- -----------------------------------------------------------------------------
create table if not exists idea_dispositions (
  id            uuid        primary key default gen_random_uuid(),
  tenant_id     uuid        not null,
  idea          text        not null,
  disposition   text        not null
                            check (disposition in (
                              'task','asset','campaign','offer','agent',
                              'workflow','parked_idea','killed_idea')),
  reason        text        not null,
  business_id   uuid,
  created_at    timestamptz not null default now()
);

create index if not exists idea_dispositions_tenant_disposition_idx
  on idea_dispositions (tenant_id, disposition);
