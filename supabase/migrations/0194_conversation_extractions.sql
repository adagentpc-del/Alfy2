-- =============================================================================
-- Migration: 0194_conversation_extractions.sql
-- Purpose:   Stand up the Conversation Engine — a single
--            `conversation_extractions` table that stores, for each natural
--            utterance, what Alfy² extracted as a thinking partner: clarifying
--            questions, connections to existing knowledge, opportunities,
--            respectfully challenged assumptions, options, detected patterns, the
--            remembered conclusion, and the outputs the conversation should
--            become (tasks, assets, agents, businesses, workflows, knowledge,
--            capital) — nothing executes without approval. Implements
--            ADR-0124-conversation on the tenant-scoped platform.
--
-- CONVERSATION EXTRACTION MODEL
--   - Each row is a COMPUTED POINT-IN-TIME EXTRACTION for one utterance: the
--     engine listens and writes out the result as a dated record (`created_at`).
--   - `utterance` is what was said; the jsonb arrays capture the thinking-partner
--     output; `conclusion` is the remembered conclusion; `outputs` is what the
--     conversation should be built into.
--   - Extractions are APPEND-ONLY: a row is a recorded listening, not edited in
--     place. There is no updated_at and no trigger — re-processing appends a row.
--
-- Conventions (NAMING_CONVENTIONS.md §4):
--   - Tables: plural snake_case.
--   - Every table: id uuid pk, tenant_id uuid not null, created_at timestamptz.
--   - updated_at only on mutable tables; this table is point-in-time, so it has
--     none and gets no set_updated_at() trigger.
--
-- TENANT CONTEXT / DENY-BY-DEFAULT
--   RLS is enabled below with no permissive default, then SELECT + INSERT policies
--   scope rows to the current tenant via current_setting('app.tenant_id', true).
--   The deliberate ABSENCE of UPDATE/DELETE policies makes every extraction immutable.
--
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- conversation_extractions — a computed point-in-time extraction for one
-- utterance. Append-only (no updated_at, no trigger).
-- -----------------------------------------------------------------------------
create table if not exists conversation_extractions (
  id                      uuid              primary key default gen_random_uuid(),
  tenant_id               uuid              not null,
  utterance               text              not null,
  clarifying_questions    jsonb             not null default '[]'::jsonb,
  connections             jsonb             not null default '[]'::jsonb,
  opportunities           jsonb             not null default '[]'::jsonb,
  challenged_assumptions  jsonb             not null default '[]'::jsonb,
  options                 jsonb             not null default '[]'::jsonb,
  patterns                jsonb             not null default '[]'::jsonb,
  conclusion              text              not null default '',
  outputs                 jsonb             not null default '[]'::jsonb,
  created_at              timestamptz       not null default now()
);

create index if not exists conversation_extractions_tenant_created_idx
  on conversation_extractions (tenant_id, created_at);

-- -----------------------------------------------------------------------------
-- Enable RLS on conversation_extractions (deny-by-default until policies are added).
-- -----------------------------------------------------------------------------
alter table conversation_extractions enable row level security;

-- =============================================================================
-- conversation_extractions — POINT-IN-TIME / APPEND-ONLY. INSERT + SELECT only.
-- No UPDATE/DELETE policy is created on purpose: deny-by-default then makes every
-- existing extraction immutable, matching events + audit_log in 0002.
-- =============================================================================
create policy conversation_extractions_select on conversation_extractions
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy conversation_extractions_insert on conversation_extractions
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
