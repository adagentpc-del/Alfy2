-- =============================================================================
-- Migration: 0227_ai_org.sql
-- Purpose:   AI Organization / Chain of Command. Sits ON TOP of the Department OS
--            (0226). Turns the flat set of agents into a structured, accountable
--            AI company: rich role cards, append-only delegation packets, agent
--            reports, escalations, accountability records, and department reports.
--
-- Tenancy:   every table carries tenant_id; RLS is deny-by-default with policies
--            scoped via current_setting('app.tenant_id', true)::uuid (unset = 0 rows).
-- Mutable:   ai_org_role_cards (updated_at + set_updated_at() trigger + UPDATE policy).
-- Append-only (SELECT + INSERT only): delegation packets, agent reports,
--   escalations, accountability records, department reports.
-- Array fields are jsonb arrays; object fields (kpis) are jsonb objects.
-- Enum-like fields are text, validated by the Zod contract (ai-org.ts) + Pydantic mirror.
-- Tables are prefixed ai_org_ to avoid clashing with the existing live tables.
-- Idempotent where reasonable (create table/index if not exists).
-- =============================================================================

-- ---- Role cards (mutable) ---------------------------------------------------
create table if not exists ai_org_role_cards (
  id                       uuid        primary key default gen_random_uuid(),
  tenant_id                uuid        not null,
  name                     text        not null,
  department_key           text        not null,
  org_layer                text        not null,
  is_leader                boolean     not null default false,
  mission                  text        not null default '',
  businesses_used_by       jsonb       not null default '[]'::jsonb,
  primary_responsibilities jsonb       not null default '[]'::jsonb,
  operating_loop           jsonb       not null default '[]'::jsonb,
  allowed_actions          jsonb       not null default '[]'::jsonb,
  requires_approval_for     jsonb      not null default '[]'::jsonb,
  inputs                   jsonb       not null default '[]'::jsonb,
  outputs                  jsonb       not null default '[]'::jsonb,
  tools_integrations       jsonb       not null default '[]'::jsonb,
  kpis                     jsonb       not null default '[]'::jsonb,
  failure_signals          jsonb       not null default '[]'::jsonb,
  escalation_rules         jsonb       not null default '[]'::jsonb,
  review_cadence           text        not null default 'weekly',
  permission_scope         text        not null default 'recommend_only',
  reports_to               text,
  status                   text        not null default 'active',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz
);

-- ---- Delegation packets (append-only) ---------------------------------------
create table if not exists ai_org_delegation_packets (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  assigning_employee   text        not null,
  assigned_agent       text        not null,
  business             text        not null default '',
  project              text        not null default '',
  objective            text        not null,
  context_stack        jsonb       not null default '[]'::jsonb,
  source_of_truth_refs jsonb       not null default '[]'::jsonb,
  required_output      text        not null default '',
  allowed_tools        jsonb       not null default '[]'::jsonb,
  prohibited_actions   jsonb       not null default '[]'::jsonb,
  approval_required    boolean     not null default false,
  deadline             text,
  priority             text        not null default 'medium',
  success_criteria     jsonb       not null default '[]'::jsonb,
  reporting_format     text        not null default '',
  escalation_trigger   text        not null default '',
  status               text        not null default 'issued',
  created_at           timestamptz not null default now()
);

-- ---- Agent reports (append-only) --------------------------------------------
create table if not exists ai_org_agent_reports (
  id                  uuid        primary key default gen_random_uuid(),
  tenant_id           uuid        not null,
  packet_id           uuid        not null,
  agent               text        not null,
  task_completed      boolean     not null default false,
  output_produced     text        not null default '',
  sources_used        jsonb       not null default '[]'::jsonb,
  assumptions         jsonb       not null default '[]'::jsonb,
  issues              jsonb       not null default '[]'::jsonb,
  confidence          double precision not null default 0.5,
  risks               jsonb       not null default '[]'::jsonb,
  approval_needed     boolean     not null default false,
  recommended_next_step text      not null default '',
  execution_status    text        not null default 'done',
  verification_status text        not null default 'unverified',
  created_at          timestamptz not null default now()
);

-- ---- Escalations (append-only) ----------------------------------------------
create table if not exists ai_org_escalations (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null,
  from_layer  text        not null,
  to_layer    text        not null,
  reason      text        not null,
  detail      text        not null default '',
  packet_id   uuid,
  resolved    boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- ---- Accountability records (append-only) -----------------------------------
create table if not exists ai_org_accountability (
  id                   uuid        primary key default gen_random_uuid(),
  tenant_id            uuid        not null,
  requesting_leader    text        not null default '',
  responsible_employee text        not null default '',
  executing_agent      text        not null,
  approving_authority  text,
  business             text        not null default '',
  task                 text        not null default '',
  status               text        not null default '',
  result               text        not null default '',
  kpi_impact           text        not null default '',
  audit_log            jsonb       not null default '[]'::jsonb,
  created_at           timestamptz not null default now()
);

-- ---- Department reports (append-only) ----------------------------------------
create table if not exists ai_org_department_reports (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  department_key        text        not null,
  cadence               text        not null,
  completed_work        jsonb       not null default '[]'::jsonb,
  pending_approvals     jsonb       not null default '[]'::jsonb,
  blockers              jsonb       not null default '[]'::jsonb,
  revenue_opportunities jsonb       not null default '[]'::jsonb,
  risks                 jsonb       not null default '[]'::jsonb,
  next_actions          jsonb       not null default '[]'::jsonb,
  kpis                  jsonb       not null default '{}'::jsonb,
  wins                  jsonb       not null default '[]'::jsonb,
  failures              jsonb       not null default '[]'::jsonb,
  lessons_learned       jsonb       not null default '[]'::jsonb,
  created_at            timestamptz not null default now()
);

-- ---- Indexes ----------------------------------------------------------------
create index if not exists ai_org_role_cards_tenant_idx        on ai_org_role_cards (tenant_id, department_key);
create index if not exists ai_org_role_cards_name_idx          on ai_org_role_cards (tenant_id, name);
create index if not exists ai_org_delegation_packets_agent_idx on ai_org_delegation_packets (tenant_id, assigned_agent);
create index if not exists ai_org_agent_reports_packet_idx     on ai_org_agent_reports (tenant_id, packet_id);
create index if not exists ai_org_escalations_tenant_idx       on ai_org_escalations (tenant_id, from_layer);
create index if not exists ai_org_accountability_agent_idx     on ai_org_accountability (tenant_id, executing_agent);
create index if not exists ai_org_department_reports_dept_idx  on ai_org_department_reports (tenant_id, department_key);

-- ---- updated_at trigger (mutable table; set_updated_at() from 0001) ----------
drop trigger if exists set_updated_at_ai_org_role_cards on ai_org_role_cards;
create trigger set_updated_at_ai_org_role_cards
  before update on ai_org_role_cards for each row execute function set_updated_at();

-- =============================================================================
-- RLS — deny-by-default + tenant-scoped policies.
-- =============================================================================
alter table ai_org_role_cards          enable row level security;
alter table ai_org_delegation_packets  enable row level security;
alter table ai_org_agent_reports       enable row level security;
alter table ai_org_escalations         enable row level security;
alter table ai_org_accountability      enable row level security;
alter table ai_org_department_reports  enable row level security;

-- Mutable: SELECT + INSERT + UPDATE (role cards).
create policy ai_org_role_cards_select on ai_org_role_cards
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ai_org_role_cards_insert on ai_org_role_cards
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ai_org_role_cards_update on ai_org_role_cards
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Append-only: SELECT + INSERT only.
create policy ai_org_delegation_packets_select on ai_org_delegation_packets
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ai_org_delegation_packets_insert on ai_org_delegation_packets
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_org_agent_reports_select on ai_org_agent_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ai_org_agent_reports_insert on ai_org_agent_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_org_escalations_select on ai_org_escalations
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ai_org_escalations_insert on ai_org_escalations
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_org_accountability_select on ai_org_accountability
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ai_org_accountability_insert on ai_org_accountability
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy ai_org_department_reports_select on ai_org_department_reports
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy ai_org_department_reports_insert on ai_org_department_reports
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
