# 21 · Database

**Supabase project:** `oxromxpjoiifvamxjluz`. **243 migration files → 245 live tables, 0 without RLS.**

## Conventions (every table)
- `id uuid pk default gen_random_uuid()`, `tenant_id uuid not null`, `created_at timestamptz default now()`.
- Mutable tables add `updated_at` + the shared `set_updated_at()` trigger + an UPDATE policy.
  Append-only tables get SELECT + INSERT policies only.
- **RLS deny-by-default**, predicate `tenant_id = current_setting('app.tenant_id', true)::uuid`. Unset
  context → zero rows (fail-closed). Some tables also key on `app.business_id`.
- Arrays/objects → `jsonb`. Enum-like fields → `text` validated by the Zod contract (not PG enums).
- Migrations: `NNNN_name.sql`, append-only/monotonic numbering, byte-identical copy in `infra/`.

## Table groups (see architecture §16 for the full map)
platform/core (tenants, events, audit_log, inbox_items, api_approval_requests, mission_control_*,
founder_capacity_snapshots) · org & people (ai_org_*, department_os_*, people-ops) · revenue & growth
(revenue_*, revops, conversion, follow_ups, decision_records, capital_*) · strategy & knowledge
(expert_*, review_*, brainstorm_*, knowops_*) · health/lifecycle/market/oversight engines.

## How migrations are applied
**Directly** via the Supabase MCP (`apply_migration`) and verified one-by-one. The GitHub→Supabase
auto-deploy is intentionally **disabled** (see `docs/DEPLOYMENT.md` and `14_DECISIONS.md`).

## Security assumptions
Isolation depends on RLS + the `app.tenant_id` GUC set by `Db.withTenant`. The service-role key bypasses
RLS and must stay server-only. See `51_SECURITY.md`.
