-- =============================================================================
-- Migration: 0199_voice_personas.sql
-- Purpose:   Stand up the Companion Voice Persona — a single `voice_personas`
--            table storing the named voice companion that is the VOICE LAYER of
--            Alfy² (not a separate brain): its name, accent (default British
--            female), tonal qualities, and duties. Implements ADR-0127 on the
--            tenant-scoped platform.
--
-- VOICE PERSONA MODEL
--   - A persona is MUTABLE configuration: it is refined over time, so the table
--     carries updated_at and a set_updated_at() trigger (mutable convention).
--   - is_voice_layer_only is pinned true (DB CHECK): the persona never becomes
--     the brain; the intelligence remains Alfy².
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS enabled below with no permissive default, then SELECT + INSERT + UPDATE
--   policies scope rows to current_setting('app.tenant_id', true). No DELETE
--   policy (personas are refined, not deleted).
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

create table if not exists voice_personas (
  id                   uuid              primary key default gen_random_uuid(),
  tenant_id            uuid              not null,
  name                 text              not null,
  accent               text              not null default 'British (female)',
  tones                jsonb             not null default '[]'::jsonb,
  duties               jsonb             not null default '[]'::jsonb,
  is_voice_layer_only  boolean           not null default true check (is_voice_layer_only = true),
  created_at           timestamptz       not null default now(),
  updated_at           timestamptz       not null default now()
);

create index if not exists voice_personas_tenant_idx on voice_personas (tenant_id);

-- updated_at trigger (mutable table). Reuses set_updated_at() from 0001.
drop trigger if exists set_updated_at_voice_personas on voice_personas;
create trigger set_updated_at_voice_personas
  before update on voice_personas
  for each row execute function set_updated_at();

alter table voice_personas enable row level security;

create policy voice_personas_select on voice_personas
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy voice_personas_insert on voice_personas
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy voice_personas_update on voice_personas
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
