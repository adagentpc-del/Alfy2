# ADR-0010 — Founder Intelligence System (multi-tenant productization)

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Alfy² should become the **Founder Intelligence System (FIS)** — a multi-tenant product where many
founders each get their own isolated instance of everything: memory, businesses, agents, billing,
permissions, dashboards, automation, and knowledge. The requirement explicitly anticipated that this
"should require almost no code changes because the architecture was designed for it from the
beginning." This ADR records that the claim held, and what minimal additions completed the picture.

## Decision
1. **Confirm the tenant-first design (no change required).** From ADR-0001 onward, every persisted row
   carries `tenant_id` with Row-Level Security, every contract that crosses a boundary carries
   `tenant_id`, and every engine method takes `tenantId` as its first argument. Becoming multi-tenant
   therefore required **zero changes to the nine engines** (Memory, Decision, Chief of Staff, Agent
   Factory, Business Template, Personal OS, Idea Builder, Pattern Engine, AI Gateway). A cross-tenant
   isolation test runs two tenants through the *unchanged* engines and proves zero data crossover.
2. **Make the not-yet-first-class separations explicit.** Five of the eight requested separations were
   already first-class and tenant-scoped: **memory** (`tenant_id` + RLS), **businesses**
   (`tenant_id` + `business_id`), **agents** (`agent_registry` per tenant), **dashboards**
   (`DashboardCard`/`DashboardSummary`, business-scoped), **automation** (the Automation department +
   Decision/Pattern automation recommendations). The three that were not yet modeled as their own
   tenant-scoped concepts — **billing**, **permissions**, **knowledge** — were added:
   contracts (`tenancy.ts`), migrations (`0008`/`0009`, `tenant_id` + RLS), and, for permissions, a
   deterministic `PermissionChecker`.
3. **The FIS account is the tenant.** A `FounderTenant` (`id` = `tenant_id`, plus `plan`/`status`) is
   the productized form of the `tenants` table. A business stays a unit *within* a tenant; a tenant is
   the isolation boundary for the whole platform.
4. **Permissions enforce tenant scoping in code.** Grants are `(tenant_id, principal, role)`; the
   `PermissionChecker` only considers grants whose `tenant_id` matches the query — a grant in tenant A
   confers nothing in tenant B. Permission scopes map one-to-one to the eight separations.

## Consequences
- **Positive:** the productization is **additive only** — new contracts, two migrations, one permission
  checker, and docs; no engine logic changed. Isolation is proven by test, not asserted. The plan
  tier and billing account give the commercial surface; permissions give per-seat access control.
- **Cost:** business-scoped domain data must keep carrying `business_id` (already the rule); the
  permission model is role-based and coarse today (no per-resource ACLs); billing is structural (usage
  counters + plan), not yet wired to a payment processor.
- **Mitigation:** finer-grained permissions can extend `Permission` without touching the checker's
  shape; billing wiring (PayPal-first) slots behind the `BillingAccount` contract; the tenant context
  (`current_setting('app.tenant_id')`) is the single, reviewable enforcement point at the data layer.

## Alternatives considered
- **Retrofit tenancy now:** unnecessary — it was there from day one. The work was to *prove* it and
  fill the three gaps.
- **One database per tenant:** stronger physical isolation but heavy ops and cost; RLS + `tenant_id`
  is the standard, cheaper default and keeps the single-codebase model. Per-tenant DBs remain an option
  for enterprise tiers later.
- **Per-business tenancy:** rejected (ADR-0006) — a business is a unit within a tenant; the tenant is
  the customer/account boundary.
