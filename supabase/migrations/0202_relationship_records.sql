-- =============================================================================
-- Migration: 0202_relationship_records.sql
-- Purpose:   Stand up the Relationship Capital Engine — a single
--            `relationship_records` table that treats each relationship as
--            long-term capital: party kind (family / friend / client / investor /
--            vendor / partner / podcast_guest / mentor / employee / advisor),
--            conversation & follow-up history, important dates, shared interests,
--            business opportunities, introductions, promises made, preferred
--            communication, health & strength (0..1), and surfaced value-creating
--            opportunities. Implements ADR-0130 on the tenant-scoped platform.
--
-- MODEL
--   - MUTABLE: relationship state evolves (health, strength, histories), so the
--     table carries updated_at + set_updated_at(). One row per (tenant, person).
--   - kind is constrained by CHECK mirrored from RelationshipPartyKindSchema.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists relationship_records (
  id                        uuid              primary key default gen_random_uuid(),
  tenant_id                 uuid              not null,
  person_id                 text              not null,
  name                      text              not null,
  kind                      text              not null check (kind in (
                                                'family','friend','client','investor','vendor','partner',
                                                'podcast_guest','mentor','employee','advisor')),
  conversation_history      jsonb             not null default '[]'::jsonb,
  follow_up_history         jsonb             not null default '[]'::jsonb,
  important_dates           jsonb             not null default '[]'::jsonb,
  shared_interests          jsonb             not null default '[]'::jsonb,
  business_opportunities    jsonb             not null default '[]'::jsonb,
  introductions             jsonb             not null default '[]'::jsonb,
  promises_made             jsonb             not null default '[]'::jsonb,
  preferred_communication   text              not null default '',
  health                    double precision  not null default 0.5 check (health >= 0 and health <= 1),
  strength                  double precision  not null default 0.5 check (strength >= 0 and strength <= 1),
  opportunities             jsonb             not null default '[]'::jsonb,
  created_at                timestamptz       not null default now(),
  updated_at                timestamptz       not null default now()
);

create unique index if not exists relationship_records_tenant_person_idx
  on relationship_records (tenant_id, person_id);

drop trigger if exists set_updated_at_relationship_records on relationship_records;
create trigger set_updated_at_relationship_records
  before update on relationship_records
  for each row execute function set_updated_at();

alter table relationship_records enable row level security;

create policy relationship_records_select on relationship_records
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy relationship_records_insert on relationship_records
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy relationship_records_update on relationship_records
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
