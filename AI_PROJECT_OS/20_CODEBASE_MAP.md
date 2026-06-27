# 20 · Codebase Map

```
Alfy2/
├─ packages/
│  ├─ shared/    @alfy2/shared — 177 Zod contracts (src/contracts/*.ts), barreled in src/index.ts.
│  │             The ONLY legal cross-boundary surface; mirrored to Pydantic in workers/.
│  ├─ core/      @alfy2/core — ~179 deterministic engine modules (src/<engine>/). Repository PORTS +
│  │             InMemory reference impls. Exported from src/index.ts. No infra (no pg, no http).
│  ├─ db/        @alfy2/db — Postgres adapters. `Db.withTenant()` sets the app.tenant_id GUC. The ONLY
│  │             package that imports `pg`. PgInbox/Approval/MissionControl/FounderCapacity/RevOps/
│  │             Decision/Capital/Delegation repositories.
│  ├─ config/    @alfy2/config — env schema (Zod) + loader + redactor. Boot-fails on invalid env.
│  └─ agents-sdk/ agent runtime primitives.
├─ services/
│  ├─ api/       @alfy2/api — Hono gateway. Entry: src/main.ts (prod), src/app.ts (createApp factory).
│  │             middleware/{auth,tenant,approval-gate}.ts · routes/{health,inbox,actions,approvals,
│  │             mission-control,founder,business-ops,org}.ts · util.ts (isUuid).
│  └─ orchestrator/  scheduled loops (scaffold).
├─ workers/      Python: alfy_workers/contracts/models.py (Pydantic mirror) + tests/ (~650 contract tests).
├─ supabase/ + infra/supabase/   243 migrations (NNNN_name.sql) → 245 live tables (all RLS).
├─ scripts/      *-smoke.mts — one runnable deterministic smoke per engine + the gateway smoke.
├─ apps/web/     index.html — the live dashboard (static; Connect → live API).
├─ docs/         canonical governing docs (Constitution, Architecture, Build Queue, Standards, etc.).
└─ AI_PROJECT_OS/  this folder — the AI operating memory.
```

**Entry points:** API = `services/api/src/main.ts`. Engines = `packages/core/src/index.ts`. Contracts =
`packages/shared/src/index.ts`. DB adapters = `packages/db/src/index.ts`. Verify gate = `tsc -b` +
`scripts/*-smoke.mts` + `cd workers && pytest`.
