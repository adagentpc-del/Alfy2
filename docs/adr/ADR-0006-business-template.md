# ADR-0006 — Business Template

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
The operator runs a portfolio of businesses. Each should come pre-organized with the same standard
departments — CEO, Operations, Sales, Marketing, Finance, Legal, Customer Success, Projects, Product,
Analytics, Deployment, Automation — so a new business is operational on day one. But the businesses
must not bleed into each other: each one's data has to stay isolated.

The tension is "same framework, isolated data": shared structure, separate state.

## Decision
1. **One canonical template, instantiated per business.** A single frozen `BUSINESS_TEMPLATE`
   (version 1.0.0) defines the twelve departments and their specs (mission, responsibilities,
   capabilities, default agents, memory scope, KPIs, dashboard card). Every business is built from it,
   so all businesses inherit the identical framework. The template is versioned so it can evolve
   without rewriting existing businesses.
2. **A `business_id` per instance + deep-cloned specs.** `BusinessFactory.create()` assigns a fresh
   `business_id` (the business's `id`) and a `data_namespace`, and deep-clones each shared department
   spec before scoping it. A business therefore cannot mutate the shared framework or another
   business — verified by the smoke test (mutating one business touches neither the other nor the
   template).
3. **Isolation enforced at the data layer.** Persistence carries `business_id` on every row
   (`businesses`, `business_departments`, and any business-scoped domain data), on top of tenant RLS.
   Tenant RLS + a `business_id` filter = per-business isolation. The `data_namespace` is a
   human-readable token for the same boundary.
4. **Departments compose existing constructs.** Each department declares a `MemoryScope`, KPIs as
   `SuccessMetric`s, a `DashboardCard`, and `default_agents` (Agent Registry keys) — reusing the
   contracts from the Memory Engine and Agent Factory. The `automation` department explicitly ties
   into the Agent Factory (detect recurring work → recommend agents).
5. **Pure factory.** `create()` builds and returns the `Business`; it performs no I/O. Persistence and
   registration happen through the same port pattern used elsewhere.

## Consequences
- **Positive:** a new business is fully structured instantly and identically; data isolation is
  guaranteed by construction (distinct ids, deep clones, `business_id` scoping); the framework can be
  versioned and upgraded centrally; departments reuse the existing memory/agent/dashboard contracts.
- **Cost:** the twelve department specs are static definitions that need curation as the operating
  model matures; per-department capability logic is declared, not yet implemented. Business-scoped
  domain tables must remember to carry `business_id`.
- **Mitigation:** the template is versioned (migrations can introduce 1.1.0, 2.0.0…); `business_id` is
  a single, reviewable scoping rule; the factory validates every instance against the contract.

## Alternatives considered
- **One tenant per business:** clean isolation, but the operator's portfolio would fragment across
  tenants and lose the single-operator view; deferred to the FounderOS multi-tenant story where a
  *customer* is a tenant. A business is a unit *within* a tenant.
- **Free-form departments per business:** flexible, but loses the "same framework" guarantee and makes
  cross-business comparison and tooling impossible. Rejected.
- **Shared (non-cloned) department specs:** less memory, but one business could mutate another's
  structure. Rejected for safety.
