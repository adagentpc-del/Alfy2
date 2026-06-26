-- Mission Control (Layer 0) persistence: generated CEO snapshots + the alert queue.
-- Snapshots are append-only history; alerts are mutable (operator acks/escalates/resolves).

create table if not exists mission_control_snapshots (
  id                    uuid        primary key default gen_random_uuid(),
  tenant_id             uuid        not null,
  business_id           uuid,
  as_of                 timestamptz not null,
  revenue_today         numeric     not null default 0,
  cash_position         numeric     not null default 0,
  cash_runway_days      integer,
  kpi_status            jsonb       not null default '{}'::jsonb,
  approval_queue        jsonb       not null default '[]'::jsonb,
  critical_alerts       jsonb       not null default '[]'::jsonb,
  blocked_tasks         jsonb       not null default '[]'::jsonb,
  active_builds         jsonb       not null default '[]'::jsonb,
  agent_activity        jsonb       not null default '{}'::jsonb,
  department_health     jsonb       not null default '{}'::jsonb,
  business_health       jsonb       not null default '{}'::jsonb,
  follow_ups_due        jsonb       not null default '[]'::jsonb,
  meetings              jsonb       not null default '[]'::jsonb,
  risk_alerts           jsonb       not null default '[]'::jsonb,
  founder_capacity      jsonb       not null default '{}'::jsonb,
  top_priorities        jsonb       not null default '[]'::jsonb,
  revenue_opportunities jsonb       not null default '[]'::jsonb,
  launch_readiness      jsonb       not null default '{}'::jsonb,
  open_loops            jsonb       not null default '[]'::jsonb,
  created_at            timestamptz not null default now()
);

create table if not exists mission_control_alerts (
  id                uuid        primary key default gen_random_uuid(),
  tenant_id         uuid        not null,
  business_id       uuid,
  severity          text        not null,
  category          text        not null,
  title             text        not null,
  detail            text        not null default '',
  source_ref        text        not null default '',
  requires_approval boolean     not null default false,
  routed_to         text        not null default 'mission_control',
  status            text        not null default 'open',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);

create index if not exists mission_control_snapshots_tenant_idx
  on mission_control_snapshots (tenant_id, as_of desc);
create index if not exists mission_control_alerts_tenant_idx
  on mission_control_alerts (tenant_id, status, severity);

drop trigger if exists set_updated_at_mission_control_alerts on mission_control_alerts;
create trigger set_updated_at_mission_control_alerts
  before update on mission_control_alerts for each row execute function set_updated_at();

alter table mission_control_snapshots enable row level security;
alter table mission_control_alerts    enable row level security;

create policy mission_control_snapshots_select on mission_control_snapshots
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy mission_control_snapshots_insert on mission_control_snapshots
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);

create policy mission_control_alerts_select on mission_control_alerts
  for select using (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy mission_control_alerts_insert on mission_control_alerts
  for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
create policy mission_control_alerts_update on mission_control_alerts
  for update using (tenant_id = current_setting('app.tenant_id', true)::uuid)
            with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
