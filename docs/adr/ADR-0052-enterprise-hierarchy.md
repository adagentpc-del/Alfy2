# ADR-0052: Enterprise Hierarchy

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² governs more than one business. As the portfolio grows, the platform needs an explicit org tree — a way
to say that a task belongs to a project, a project to a team, a team to a department, and so on up to the
enterprise — and a way for the things that should flow down (policies, security, branding, permissions, reusable
assets) to be inherited rather than re-declared at every level. This ADR adds that tree and the inheritance
rule that makes it useful.

## Decision

Add a `hierarchy/` registry in `@alfy2/core` that models the eight-level org tree and resolves inherited
configuration top-down. Deterministic, tenant-scoped.

### Eight levels

The tree is **Enterprise → Company → Department → Team → Project → Asset → Task → Agent** — eight levels, each
a node with a level and a parent. A child's level must sit strictly **below** its parent's; the registry rejects
a node placed at or above its parent, so the tree can never invert.

### Inheritance — merge top-down

`resolve()` walks from the root to a node and merges inherited configuration: **lists union** (a child adds to,
never erases, the policies/assets it inherits) while **scalars override** (a company-specific branding or limit
replaces the inherited one). This is the rule that lets a company override a default without breaking
inheritance for everything else — overrides are additive where it matters and replacing only where intended.
Policies, security, branding, permissions, and reusable assets all flow down this way.

### Portfolio views and sharing

`atLevel` returns every node at a given level for **portfolio reporting** (all companies, all projects). Shared
resources — vendors, SOPs, compliance — can be marked `sharedAcrossCompanies` so cross-company opportunities and
reuse are first-class, not copy-paste. The tree is the substrate for "every project under this company" and
"every vendor shared across the portfolio" style questions.

### Contracts & data

`packages/shared/src/contracts/hierarchy.ts`: `HierarchyLevel`, `HierarchyNode`, `InheritedConfig`,
`ResolvedNode`. Migrations `0089`/`0090` add `hierarchy_nodes` + RLS. Smoke `pnpm hierarchy:smoke`.

## Consequences

- The portfolio has an explicit, eight-level org tree, and a child can never sit at or above its parent.
- Inheritance is mechanical: lists union and scalars override, so a company override is local and never erases
  what it inherits — policies, security, branding, permissions, and reusable assets all flow down once.
- Portfolio reporting (`atLevel`) and cross-company sharing (`sharedAcrossCompanies`) are first-class, enabling
  cross-company opportunities and shared vendors/SOPs/compliance without duplication.
- Phase 2 resolves the tree behind the Control Tower and Mission Control so dashboards roll up by level.
