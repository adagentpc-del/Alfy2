# Alfy² — Connector Registry

Integrations are **modular and never hard-coded**. Each connector is a descriptor in the registry, so
current and future connectors — including arbitrary MCP connectors — are added as data. Decision
record: [`adr/ADR-0012`](./adr/ADR-0012-router-and-connectors.md).

## Every connector carries
`permissions` · `authentication` · `risk_level` · `allowed_actions` · `businesses_using` ·
`health_status` · `last_sync` — plus id, tenant, name, free-text `kind`/`category`, `enabled`, and
`created_at`. `kind` and `category` are free strings (not enums) so a future connector needs no schema
or code change.

## Not hard-coded — two ways to add one
- **Install a blueprint:** known connectors (GitHub, Gmail, Calendar, Google Drive, Slack, Discord,
  Stripe, Supabase, Notion, CRM, and a generic `mcp`) are blueprint *data*. `install(tenantId, kind,
  overrides)` creates a tenant-scoped descriptor from one.
- **Register a full descriptor:** any future/custom connector with no blueprint is `register()`-ed
  directly. The smoke registers a connector with a never-seen `kind` and it just works.

## Tenant-scoped & operational
Connectors carry `tenant_id` + RLS; the registry only returns the tenant's connectors. Lifecycle
helpers update operational state: `recordSync()` stamps `last_sync` and marks `healthy`; `setHealth()`
sets degraded/down; `addBusiness()` records which businesses use it. Query by `byCategory`, `byKind`,
`byBusiness`.

## API
```ts
const registry = new ConnectorRegistry();
const gh = registry.install(tenantId, "github", { businesses_using: ["a3-visual", "move-mi"] });
registry.recordSync(tenantId, gh.id);          // → health: healthy, last_sync set
registry.register({ id: "x", tenant_id, kind: "some-future-saas", authentication: "mcp", … });
registry.byBusiness(tenantId, "a3-visual");    // connectors a business uses
```

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/connector-registry.ts` (+ Pydantic mirror) |
| Blueprints (data) | `packages/core/src/connector-registry/blueprints.ts` |
| Registry | `packages/core/src/connector-registry/registry.ts` |
| Persistent schema | `infra/supabase/migrations/0012_connectors.sql`, `0013_..._rls.sql` |
| Smoke test | `scripts/router-connector-smoke.mts` (`pnpm run router:smoke`) |

## Boundaries
- This is the registry + metadata layer. Connector **execution** (actually calling GitHub/Gmail/…)
  plugs in per `kind` as adapters in Phase 2 without changing the registry.
- Free-text `kind`/`category` keep it open-ended; the persisted table does not constrain them.
