# 04 · System Architecture

**Canonical:** `docs/ALFIE2_OPERATIONS_ARCHITECTURE.md`. Summary for orientation:

## Monorepo (contracts-first)
```
packages/shared   177 Zod contracts — the only legal cross-boundary surface (mirrored to Pydantic)
packages/core     ~179 deterministic engine modules (in-memory reference stores; repository PORTS)
packages/db       @alfy2/db — Postgres adapters; pg lives ONLY here; Db.withTenant() sets app.tenant_id GUC
packages/config   layered env loader + Zod validation
services/api      HTTP gateway: auth → tenant context → approval gate → routes (LIVE, ~28 endpoints)
services/orchestrator  scheduled loops (scaffold; not yet built)
workers/          Python Pydantic mirror of the contracts + contract tests
supabase/ infra/  243 migrations → 245 live tables (all RLS)
```

## Five operating systems (under the Constitution)
AOS (runs the AI org) · AESL (specs/build queue) · AMC (`ALFIE_MASTER_CONTROL.md`, navigation) ·
ADOS (`ALFIE_DOCUMENTATION_OPERATING_SYSTEM.md`, knowledge governance) · Mission Control (day-to-day ops).

## Request path (runtime)
`client → services/api → verify token/JWT → resolve tenant (+business) → Db.withTenant (RLS GUC) →
approval gate (default-deny on risky routes) → engine → response.`

## Non-negotiables
Contracts first · tenant isolation by construction (RLS) · approval-gated execution · business-aware
context loading · deterministic-before-AI · cost control · verify-merge over rebuild · Alyssa is final
authority on money/public/legal/deploy/pricing.
