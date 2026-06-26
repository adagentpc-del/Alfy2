# Infra

Deployment and data infrastructure. Supabase is the default datastore/auth/storage (no second
datastore without an ADR — see `docs/COST_CONTROL_PLAN.md`).

## supabase/
- `migrations/` — Phase 1 creates the platform tables from `docs/TECH_SPEC.md` §5, all with
  `tenant_id` + Row-Level Security, deny-by-default. `events` and `audit_log` are append-only.
- `seed/` — minimal seed: the single default tenant for single-operator mode.

No business tables are created in Phase 0.
