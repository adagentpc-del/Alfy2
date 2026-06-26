-- =============================================================================
-- Migration: 0217_future_me_assessments.sql
-- Purpose:   Stand up the Future Me Engine — a single `future_me_assessments`
--            table recording, for one decision, the six future-facing signals, the
--            regret risk, the verdict (future_alyssa_thanks_you / mixed /
--            future_alyssa_regrets), and a better path when Future Alyssa would
--            regret it. Implements ADR-0148 on the tenant-scoped platform.
--
-- MODEL: APPEND-ONLY (point-in-time assessment). verdict CHECK-constrained.
-- RLS: deny-by-default; SELECT + INSERT only. No UPDATE/DELETE.
-- =============================================================================

create table if not exists future_me_assessments (
  id            uuid              primary key default gen_random_uuid(),
  tenant_id     uuid              not null,
  decision      text              not null,
  signals       jsonb             not null default '{}'::jsonb,
  regret_risk   double precision  not null default 0 check (regret_risk >= 0 and regret_risk <= 1),
  verdict       text              not null check (verdict in (
                                    'future_alyssa_thanks_you','mixed','future_alyssa_regrets')),
  better_path   text              null,
  reason        text              not null,
  created_at    timestamptz       not null default now()
);

create index if not exists future_me_assessments_tenant_created_idx
  on future_me_assessments (tenant_id, created_at);

alter table future_me_assessments enable row level security;

create policy future_me_assessments_select on future_me_assessments
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy future_me_assessments_insert on future_me_assessments
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
