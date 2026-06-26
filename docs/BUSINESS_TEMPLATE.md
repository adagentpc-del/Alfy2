# Alfy² — Business Template

Every business in Alfy² is created from one canonical template, so they all **inherit the same
framework** — the twelve departments — while each keeps its **data isolated** by `business_id`.
Decision record: [`adr/ADR-0006`](./adr/ADR-0006-business-template.md).

## The twelve departments
Every business automatically gets all of these (in this order):

`ceo · operations · sales · marketing · finance · legal · customer_success · projects · product ·
analytics · deployment · automation`

Each department carries: a mission, responsibilities, capabilities, `default_agents` (Agent Registry
keys), a `memory_scope` (which memory kinds it reads, business-scoped at runtime), KPIs (as
`SuccessMetric`s), and a `dashboard_card`. The `automation` department ties directly into the Agent
Factory (detect recurring work → recommend agents).

## Same framework, isolated data
- **Same framework:** one frozen `BUSINESS_TEMPLATE` (version 1.0.0) defines all twelve departments.
  Every business is instantiated from it, so the structure and department specs are identical across
  businesses. The template is versioned so it can evolve centrally.
- **Isolated data:** `BusinessFactory.create()` assigns each business a unique `business_id` (its
  `id`) and a `data_namespace`, and **deep-clones** every shared spec before scoping it — so a
  business can never mutate the shared framework or another business. Persistence carries `business_id`
  on every row (on top of tenant RLS); tenant RLS + `business_id` = per-business isolation.

## API
```ts
const factory = new BusinessFactory();
const moveMi   = factory.create(tenantId, { name: "Move Mi" });          // 12 departments, scoped to its id
const crowning = factory.create(tenantId, { name: "Crowning Academy" }); // same framework, different data

BusinessFactory.department(moveMi, "finance"); // pull one department by kind
```
`slug` and `template_version` are derived/defaulted if omitted.

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/business.ts` (+ Pydantic mirror in `workers/`) |
| Canonical template (the 12 departments) | `packages/core/src/business/template.ts` |
| Factory | `packages/core/src/business/factory.ts` |
| Persistent schema | `infra/supabase/migrations/0005_business.sql`, `0006_business_rls.sql` |
| Smoke test | `scripts/business-smoke.mts` (`pnpm run business:smoke`) |

## Persistence & isolation
`businesses` and `business_departments` (and any business-scoped domain data) carry both `tenant_id`
and `business_id`, with RLS deny-by-default scoped to the tenant. Application queries always filter
`business_id` — that combination keeps each business's data isolated. The smoke test verifies the
in-memory guarantees: identical framework across businesses, distinct ids/namespaces, no cross-wired
`business_id`, and that mutating one business affects neither another business nor the template.

## Boundaries
- The factory is **pure** — it builds and returns a `Business`; persistence/registration happen
  through the same port pattern used elsewhere.
- Department capability logic is declared, not yet implemented; departments lean on shared platform
  agents (`default_agents`) and the Agent Factory for new ones.
