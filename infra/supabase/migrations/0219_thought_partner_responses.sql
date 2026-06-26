-- =============================================================================
-- Migration: 0219_thought_partner_responses.sql
-- Purpose:   Stand up the Executive Thought Partner — a single
--            `thought_partner_responses` table recording each response: stance
--            (challenge / support / compare_options / refine_execution), challenged
--            assumptions, blind spots, alternatives, risks, tradeoffs, honest
--            uncertainty, and the reasoning behind the stance. Implements ADR-0150
--            on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY. stance CHECK-constrained. reasoning is always present
--   (the partner never just agrees or rejects).
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists thought_partner_responses (
  id                      uuid          primary key default gen_random_uuid(),
  tenant_id               uuid          not null,
  proposition             text          not null,
  stance                  text          not null check (stance in (
                                          'challenge','support','compare_options','refine_execution')),
  challenged_assumptions  jsonb         not null default '[]'::jsonb,
  blind_spots             jsonb         not null default '[]'::jsonb,
  alternatives            jsonb         not null default '[]'::jsonb,
  risks                   jsonb         not null default '[]'::jsonb,
  tradeoffs               jsonb         not null default '[]'::jsonb,
  uncertain               boolean       not null default false,
  reasoning               text          not null,
  created_at              timestamptz   not null default now()
);

create index if not exists thought_partner_responses_tenant_created_idx
  on thought_partner_responses (tenant_id, created_at);

alter table thought_partner_responses enable row level security;

create policy thought_partner_responses_select on thought_partner_responses
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy thought_partner_responses_insert on thought_partner_responses
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
