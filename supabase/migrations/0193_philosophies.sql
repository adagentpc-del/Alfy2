-- =============================================================================
-- Migration: 0193_philosophies.sql
-- Purpose:   Stand up the Philosophy Library — a single `philosophies` table that
--            stores every principle, equation, framework, mental model, operating
--            philosophy, and insight that defines Alfy²: name, purpose,
--            explanation, visual diagram, examples, related algorithms/agents,
--            businesses using it, a Core pin, and a revision count — so one can
--            be surfaced as "Today's Reminder" each day. Implements
--            ADR-0123-philosophy-library on the tenant-scoped platform.
--
-- PHILOSOPHY MODEL
--   - Each row is a stored philosophy: its name, purpose, explanation, and visual
--     diagram; jsonb arrays for examples, related algorithms, related agents, and
--     businesses using it; a `core` pin; and a `revision` count.
--   - Philosophies support revision history and pinning — they are UPDATED in
--     place (revision increments, core toggles, text is refined) — so the table
--     is MUTABLE: it carries updated_at and the shared set_updated_at() trigger
--     from 0001 (reused here, not redefined).
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables, maintained by the shared trigger
--     function set_updated_at() defined in 0001 (reused here, not redefined).
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then full CRUD policies scope
--   rows to the current tenant via current_setting('app.tenant_id', true).
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- philosophies — a stored philosophy, updated in place to support revision
-- history and pinning. Mutable (carries updated_at + set_updated_at trigger).
-- -----------------------------------------------------------------------------
create table if not exists philosophies (
  id                  uuid              primary key default gen_random_uuid(),
  tenant_id           uuid              not null,
  name                text              not null,
  purpose             text              not null default '',
  explanation         text              not null default '',
  visual_diagram      text              not null default '',
  examples            jsonb             not null default '[]'::jsonb,
  related_algorithms  jsonb             not null default '[]'::jsonb,
  related_agents      jsonb             not null default '[]'::jsonb,
  businesses_using    jsonb             not null default '[]'::jsonb,
  core                boolean           not null default false,
  revision            integer           not null default 0 check (revision >= 0),
  created_at          timestamptz       not null default now(),
  updated_at          timestamptz
);

create index if not exists philosophies_tenant_created_idx
  on philosophies (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger for philosophies. Reuses set_updated_at() from 0001
-- (do NOT redefine the function here).
-- -----------------------------------------------------------------------------
drop trigger if exists set_updated_at_philosophies on philosophies;
create trigger set_updated_at_philosophies
  before update on philosophies
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Enable RLS on philosophies (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table philosophies enable row level security;

-- =============================================================================
-- philosophies — mutable: a philosophy is recorded, then updated in place as it
-- is revised and pinned. select/insert/update/delete, all tenant-scoped.
-- =============================================================================
create policy philosophies_select on philosophies
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy philosophies_insert on philosophies
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy philosophies_update on philosophies
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy philosophies_delete on philosophies
  for delete using (tenant_id = current_setting('app.tenant_id', true)::uuid);
