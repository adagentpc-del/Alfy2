-- =============================================================================
-- Migration: 0234_incentive_ecosystem.sql
-- Purpose:   Incentive Alignment + Referral Ecosystem + Value Exchange.
--            Persists incentive evaluations (value-exchange scored, approval-
--            gated for money), referral programs, rev-share records (payout
--            approval-gated), ecosystem health scores, and win-win-win reviews.
--            CORE RULE: protect the business first; don't design extractive
--            systems — design compounding ecosystems with clear value flow.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable tables (ecosystem_referral_programs) get updated_at + the shared
--   set_updated_at() trigger (from 0001) + UPDATE policy. Evaluations, rev-share,
--   health scores, and win-win-win reviews are append-only (SELECT + INSERT only).
-- Array fields are jsonb. Enum-like fields are text, validated by the Zod
--   contract (incentive-ecosystem.ts) + Pydantic mirror.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Incentive evaluations (append-only) ------------------------------------
create table if not exists ecosystem_incentive_evaluations (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  business_key          text        not null,
  participant_kind      text        not null,
  incentive_type        text        not null,
  what_they_want        text        not null default '',
  what_they_give        text        not null default '',
  what_they_receive     text        not null default '',
  business_upside       double precision not null default 0,
  participant_upside    double precision not null default 0,
  cost_to_deliver       double precision not null default 0,
  margin_impact         double precision not null default 0,
  retention_impact      double precision not null default 0,
  referral_likelihood   double precision not null default 0,
  reputation_impact     double precision not null default 0,
  abuse_risk            double precision not null default 0,
  value_exchange_score  double precision not null default 0,
  approval_required     boolean     not null default false,
  verdict               text        not null default 'revise',
  notes                 text        not null default '',
  created_at            timestamptz not null default now()
);

-- ---- Referral programs (mutable) --------------------------------------------
create table if not exists ecosystem_referral_programs (
  id                      uuid        primary key default gen_random_uuid(),
  tenant_id               uuid        not null,
  business_key            text        not null,
  who_can_refer           text        not null default '',
  who_they_refer          text        not null default '',
  reward                  text        not null default '',
  tracking_method         text        not null default '',
  payout_logic            text        not null default '',
  eligibility             text        not null default '',
  fraud_prevention        text        not null default '',
  relationship_protection text        not null default '',
  follow_up_sequence      jsonb       not null default '[]'::jsonb,
  status                  text        not null default 'active',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz
);

-- ---- Rev-share records (append-only; payout advance is approval-gated) -------
create table if not exists ecosystem_revshare (
  id               uuid        primary key default gen_random_uuid(),
  tenant_id        uuid        not null,
  business_key     text        not null,
  source_partner   text        not null default '',
  referred_party   text        not null default '',
  transaction_ref  text        not null default '',
  fee_pct          double precision not null default 0,
  payout_pct       double precision not null default 0,
  payout_trigger   text        not null default '',
  payout_status    text        not null default 'pending',
  agreement_status text        not null default '',
  created_at       timestamptz not null default now()
);

-- ---- Ecosystem health scores (append-only) ----------------------------------
create table if not exists ecosystem_health_scores (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  business_key         text        not null,
  value_created        double precision not null default 0,
  incentive_fairness   double precision not null default 0,
  referral_activity    double precision not null default 0,
  repeat_participation double precision not null default 0,
  trust_signals        double precision not null default 0,
  disputes             integer     not null default 0,
  payout_timeliness    double precision not null default 0,
  retention            double precision not null default 0,
  satisfaction         double precision not null default 0,
  score                double precision not null default 0,
  created_at           timestamptz not null default now()
);

-- ---- Win-win-win reviews (append-only) --------------------------------------
create table if not exists ecosystem_win_win_win (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  business_key      text        not null,
  proposal          text        not null default '',
  alyssa_wins       boolean     not null default false,
  participant_wins  boolean     not null default false,
  end_customer_wins boolean     not null default false,
  builds_trust      boolean     not null default false,
  encourages_repeat boolean     not null default false,
  creates_referrals boolean     not null default false,
  verdict           text        not null default 'revise',
  created_at        timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists ecosystem_incentive_evaluations_tenant_idx on ecosystem_incentive_evaluations (tenant_id, business_key);
create index if not exists ecosystem_referral_programs_tenant_idx      on ecosystem_referral_programs (tenant_id, business_key);
create index if not exists ecosystem_revshare_tenant_idx               on ecosystem_revshare (tenant_id, business_key);
create index if not exists ecosystem_health_scores_tenant_idx          on ecosystem_health_scores (tenant_id, business_key);
create index if not exists ecosystem_win_win_win_tenant_idx            on ecosystem_win_win_win (tenant_id, business_key);

-- ---- updated_at trigger (mutable table; set_updated_at() from 0001) ----------
drop trigger if exists set_updated_at_ecosystem_referral_programs on ecosystem_referral_programs;
create trigger set_updated_at_ecosystem_referral_programs
  before update on ecosystem_referral_programs for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table ecosystem_incentive_evaluations enable row level security;
alter table ecosystem_referral_programs      enable row level security;
alter table ecosystem_revshare               enable row level security;
alter table ecosystem_health_scores          enable row level security;
alter table ecosystem_win_win_win            enable row level security;

-- Append-only: SELECT + INSERT only (evaluations).
create policy ecosystem_incentive_evaluations_select on ecosystem_incentive_evaluations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ecosystem_incentive_evaluations_insert on ecosystem_incentive_evaluations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Mutable: SELECT + INSERT + UPDATE (referral programs).
create policy ecosystem_referral_programs_select on ecosystem_referral_programs
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ecosystem_referral_programs_insert on ecosystem_referral_programs
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ecosystem_referral_programs_update on ecosystem_referral_programs
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only (rev-share). Payout-status advance happens
-- via the approval-gated engine path; the row itself is not mutated by RLS UPDATE.
create policy ecosystem_revshare_select on ecosystem_revshare
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ecosystem_revshare_insert on ecosystem_revshare
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only (health scores).
create policy ecosystem_health_scores_select on ecosystem_health_scores
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ecosystem_health_scores_insert on ecosystem_health_scores
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only (win-win-win reviews).
create policy ecosystem_win_win_win_select on ecosystem_win_win_win
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ecosystem_win_win_win_insert on ecosystem_win_win_win
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
