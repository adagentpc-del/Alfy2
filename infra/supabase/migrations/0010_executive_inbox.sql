-- =============================================================================
-- Migration: 0010_executive_inbox.sql
-- Purpose:   Create the Alfy² Executive Inbox — the single entry point into the
--            system. Anything the executive drops (a voice note, screenshot,
--            PDF, link, photo, contract, idea, …) lands here, gets processed by
--            the inbox pipeline, and is persisted as an `inbox_items` row: the
--            durable form of a ProcessedInboxItem. From here it fans out into the
--            Memory Engine, dashboards, tasks, and agents.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared set_updated_at()
--     trigger (defined in 0001 — reused here, NOT redefined).
--   - Foreign keys: <entity>_id.
--
-- RLS policies and the deny-by-default posture live in
-- 0011_executive_inbox_rls.sql. This file only defines structure; it does NOT
-- enable RLS.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- inbox_items — the persisted form of a ProcessedInboxItem. Mutable: an item is
-- triaged, reviewed, actioned, and archived over its life. Each row is one piece
-- of dropped content together with the pipeline's classification, routing, and
-- the full ProcessedInboxItem payload.
-- -----------------------------------------------------------------------------
create table if not exists inbox_items (
  id                 uuid        primary key default gen_random_uuid(),
  tenant_id          uuid        not null,
  source             text        not null,
  item_type          text        not null
                                 check (item_type in (
                                   'voice_note','screenshot','pdf','video','photo',
                                   'email','calendar_invite','github_link','url',
                                   'text','todo_list','meeting_notes','idea',
                                   'receipt','contract','invoice','business_card',
                                   'unknown'
                                 )),
  category           text        not null
                                 check (category in (
                                   'business','personal','finance','health',
                                   'learning','relationship','legal','asset',
                                   'technology','opportunity','risk','task',
                                   'project','idea'
                                 )),
  confidence         real        not null default 0
                                 check (confidence >= 0 and confidence <= 1),
  suggested_business text,
  suggested_owner    text        not null,
  urgency            real        not null default 0
                                 check (urgency >= 0 and urgency <= 1),
  urgency_level      text        not null
                                 check (urgency_level in (
                                   'low','medium','high','critical'
                                 )),
  next_action        text        not null,
  saved_memory_id    uuid,
  requires_approval  boolean     not null default false,
  dashboard_updated  boolean     not null default true,
  content            text        not null default '',
  payload            jsonb       not null default '{}'::jsonb,
  status             text        not null default 'new'
                                 check (status in (
                                   'new','reviewed','actioned','archived'
                                 )),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,
  -- Generated full-text search vector over the original content + next action.
  search_tsv         tsvector    generated always as (
                       to_tsvector(
                         'english',
                         coalesce(content, '') || ' ' ||
                         coalesce(next_action, '')
                       )
                     ) stored
);

-- Indexes on inbox_items.
create index if not exists inbox_items_search_tsv_idx   on inbox_items using gin (search_tsv);
create index if not exists inbox_items_payload_idx      on inbox_items using gin (payload);
create index if not exists inbox_items_tenant_status_idx on inbox_items (tenant_id, status);
create index if not exists inbox_items_tenant_category_idx
                                                        on inbox_items (tenant_id, category);
create index if not exists inbox_items_tenant_created_idx
                                                        on inbox_items (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for inbox_items (the only mutable table here). Reuses the
-- shared set_updated_at() function defined in 0001 — do NOT redefine it.
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_inbox_items on inbox_items;
create trigger set_updated_at_inbox_items
  before update on inbox_items
  for each row execute function set_updated_at();
