-- =============================================================================
-- Migration: 0201_meeting_prep.sql
-- Purpose:   Stand up Meeting Prep — two APPEND-ONLY tables: `meeting_dossiers`
--            (the pre-meeting executive dossier) and `meeting_recaps` (the
--            post-meeting capture). Each makes a meeting feel like an executive
--            team prepared Alyssa beforehand and captured the outcome afterward.
--            Implements ADR-0129 on the tenant-scoped platform.
--
-- MODEL
--   - Both tables are POINT-IN-TIME / APPEND-ONLY: a dossier is the prep produced
--     for one meeting; a recap is what was captured after. No updated_at, no
--     trigger. A recap may reference its dossier (dossier_id, nullable).
--   - Rich fields are stored as jsonb arrays (talking points, risks, etc.).
--
-- RLS: deny-by-default; SELECT + INSERT only on each (immutable records). No
--   UPDATE/DELETE policy is created on purpose.
-- Idempotent where reasonable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- meeting_dossiers — the pre-meeting dossier. Append-only.
-- ---------------------------------------------------------------------------
create table if not exists meeting_dossiers (
  id                          uuid          primary key default gen_random_uuid(),
  tenant_id                   uuid          not null,
  title                       text          not null,
  when_at                     timestamptz   null,
  person_profile              text          not null default '',
  company_profile             text          not null default '',
  relationship_history        jsonb         not null default '[]'::jsonb,
  conversation_history        jsonb         not null default '[]'::jsonb,
  mutual_contacts             jsonb         not null default '[]'::jsonb,
  relevant_news               jsonb         not null default '[]'::jsonb,
  open_action_items           jsonb         not null default '[]'::jsonb,
  negotiation_opportunities   jsonb         not null default '[]'::jsonb,
  talking_points              jsonb         not null default '[]'::jsonb,
  questions_to_ask            jsonb         not null default '[]'::jsonb,
  potential_risks             jsonb         not null default '[]'::jsonb,
  supporting_documents        jsonb         not null default '[]'::jsonb,
  objective                   text          not null default '',
  desired_outcome             text          not null default '',
  created_at                  timestamptz   not null default now()
);

create index if not exists meeting_dossiers_tenant_created_idx
  on meeting_dossiers (tenant_id, created_at);

alter table meeting_dossiers enable row level security;

create policy meeting_dossiers_select on meeting_dossiers
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy meeting_dossiers_insert on meeting_dossiers
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- meeting_recaps — the post-meeting capture. Append-only.
-- ---------------------------------------------------------------------------
create table if not exists meeting_recaps (
  id                     uuid          primary key default gen_random_uuid(),
  tenant_id              uuid          not null,
  dossier_id             uuid          null,
  title                  text          not null,
  summary                text          not null default '',
  commitments            jsonb         not null default '[]'::jsonb,
  follow_ups             jsonb         not null default '[]'::jsonb,
  relationship_updates   jsonb         not null default '[]'::jsonb,
  next_actions           jsonb         not null default '[]'::jsonb,
  created_at             timestamptz   not null default now()
);

create index if not exists meeting_recaps_tenant_created_idx
  on meeting_recaps (tenant_id, created_at);

alter table meeting_recaps enable row level security;

create policy meeting_recaps_select on meeting_recaps
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy meeting_recaps_insert on meeting_recaps
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
