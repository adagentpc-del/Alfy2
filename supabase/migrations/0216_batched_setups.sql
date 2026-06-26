-- =============================================================================
-- Migration: 0216_batched_setups.sql
-- Purpose:   Stand up the Batch Once Engine — a single `batched_setups` table that
--            groups a repeated setup pattern into a do-once sprint: grouped tasks,
--            a one-time checklist, the manual explanation, exact copy/paste values,
--            recorded locations, verification, and the SOP it becomes for reuse.
--            Implements ADR-0147 on the tenant-scoped platform.
--
-- MODEL
--   - MUTABLE: a setup moves queued -> in_progress -> verified -> reusable, so the
--     table carries updated_at + set_updated_at(). pattern + status CHECK-constrained.
--
-- RLS: deny-by-default; SELECT + INSERT + UPDATE scoped to tenant. No DELETE.
-- Idempotent where reasonable.
-- =============================================================================

create table if not exists batched_setups (
  id                   uuid          primary key default gen_random_uuid(),
  tenant_id            uuid          not null,
  pattern              text          not null check (pattern in (
                                        'api_keys','secrets','env_vars','dns_records','domain_verification',
                                        'github_setup','supabase_setup','render_setup','resend_setup',
                                        'stripe_setup','social_accounts','brand_assets','intro_outro_uploads',
                                        'email_template_approvals','workflow_approvals')),
  business_context     text          not null default '',
  grouped_tasks        jsonb         not null default '[]'::jsonb,
  one_time_checklist   jsonb         not null default '[]'::jsonb,
  manual_explanation   text          not null default '',
  copy_paste_values    jsonb         not null default '[]'::jsonb,
  recorded_locations   jsonb         not null default '[]'::jsonb,
  verified             boolean       not null default false,
  sop_ref              text          null,
  reusable             boolean       not null default false,
  status               text          not null default 'queued' check (status in (
                                        'queued','in_progress','verified','reusable')),
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

create index if not exists batched_setups_tenant_pattern_idx on batched_setups (tenant_id, pattern);

drop trigger if exists set_updated_at_batched_setups on batched_setups;
create trigger set_updated_at_batched_setups
  before update on batched_setups
  for each row execute function set_updated_at();

alter table batched_setups enable row level security;

create policy batched_setups_select on batched_setups
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy batched_setups_insert on batched_setups
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy batched_setups_update on batched_setups
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
