# Alfy² → Founder Intelligence System

The multi-tenant productization of Alfy². Each founder is a **tenant** with a fully isolated instance
of everything. The headline: this required **almost no code changes**, because the architecture was
tenant-first from day one. Decision record: [`adr/ADR-0010`](./adr/ADR-0010-founder-intelligence-system.md).

## The tenant boundary
A `FounderTenant` (`id` = `tenant_id`, plus `plan` and `status`) is the account. Every persisted row
carries `tenant_id` with Row-Level Security; every contract that crosses a boundary carries
`tenant_id`; every engine method takes `tenantId` first. A business is a unit *within* a tenant.

## The eight separations — where isolation lives
| Separation | Isolated by | Status |
|---|---|---|
| **memory** | `tenant_id` on `memories`/`memory_links` + RLS; `MemoryEngine` methods take `tenantId` | already first-class |
| **businesses** | `tenant_id` + `business_id` on `businesses`/`business_departments` + RLS | already first-class |
| **agents** | `agent_registry` rows carry `tenant_id` + RLS; the Agent Factory registers per tenant | already first-class |
| **dashboards** | `DashboardCard`/`DashboardSummary`, business- and tenant-scoped | already first-class |
| **automation** | the Automation department + Decision/Pattern automation recommendations, all tenant-scoped | already first-class |
| **billing** | `billing_accounts` (`tenant_id` + RLS), `BillingAccount` contract, plan tiers | **added now** |
| **permissions** | `grants` (`tenant_id, principal, role`) + RLS, `Permission`/`Role` contracts, `PermissionChecker` | **added now** |
| **knowledge** | `knowledge_docs` (`tenant_id` + RLS), `KnowledgeDoc` contract (distinct from per-entity memory) | **added now** |

Five were already isolated; three (billing, permissions, knowledge) were made first-class — additively.

## Proof: no engine changes
`scripts/tenancy-isolation-smoke.mts` (`pnpm run tenancy:smoke`) runs **two tenants** through the
**unchanged** Memory, Business, and Personal OS engines and asserts:
- tenant B cannot see tenant A's memory;
- each tenant's businesses (and their departments) are scoped to that tenant;
- Personal OS in tenant B does not resolve an entity remembered in tenant A;
- the `PermissionChecker` grants nothing across tenants (a grant in A confers nothing in B), and roles
  scope correctly (viewer reads but cannot write).

All nine engine smokes still pass with zero edits to engine code. The only new code is additive:
`packages/shared/src/contracts/tenancy.ts`, `packages/core/src/tenancy/permissions.ts`, migrations
`0008`/`0009`, and this documentation.

## Permissions model
Roles: `owner` ⊃ `admin` ⊃ `member` ⊃ `viewer`. Permission scopes map one-to-one to the separations
(`memory.read/write`, `businesses.manage`, `agents.manage`, `billing.manage`, `permissions.manage`,
`dashboards.view`, `automation.manage`, `knowledge.read/write`, `approve.irreversible`). The
`PermissionChecker` resolves a principal's permissions from their grants **within a single tenant**.

## The pieces
| Piece | Location |
|---|---|
| Tenancy contracts (Zod) | `packages/shared/src/contracts/tenancy.ts` (+ Pydantic mirror) |
| Permission checker | `packages/core/src/tenancy/permissions.ts` |
| Persistent schema | `infra/supabase/migrations/0008_founder_intelligence.sql`, `0009_founder_intelligence_rls.sql` |
| Isolation proof | `scripts/tenancy-isolation-smoke.mts` (`pnpm run tenancy:smoke`) |

## What's left for full SaaS
- Wire `BillingAccount` to a payment processor (PayPal-first) and meter `usage_*`.
- Sign-up / tenant provisioning flow and the web shell.
- The live orchestration loop (Phase 2) so all of this runs on real data.
