# ADR-0014 — Global Asset Library

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Every business accumulates assets — logos, brand guides, domains, social accounts, pitch/investor/sales
decks, contracts, NDAs, SOPs, email templates, landing pages, automations, GitHub repos, API keys,
product specs, videos, photos, training, pricing, vendor lists, customer lists, marketing campaigns.
They need one catalog that spans every business, is searchable globally, and yet respects who is
allowed to see what — finding an asset must not leak a sensitive or private one.

## Decision
1. **One tenant-scoped catalog, many asset types.** A single `assets` table with a `type` from a fixed
   catalog (24 kinds) and rich metadata — owner, business, version, status, approval, location,
   sensitive flag, visibility, tags, relationships, usage history, and search keywords. A GitHub repo
   approved by the GitHub Intelligence System is just one asset type (`github_repo`).
2. **Search is global; permissions are maintained.** `search()` ranks across all of the tenant's
   businesses, then **filters out anything the requesting principal may not see** — so global
   discovery never reveals gated assets. The gate reuses the tenancy roles (owner/admin/member/viewer)
   via an injected resolver (the `PermissionChecker`): `private` assets are visible only to their owner
   or an elevated role, and `sensitive` assets (e.g. `api_key`) only to elevated roles, regardless of
   visibility. Everything else is visible to any grant-holder.
3. **Locations, not payloads.** Assets store a `location` (URL, file path, connector ref, or secret
   ref) — never the secret itself. An `api_key` asset points at a secret store; the value never lives
   in the catalog.
4. **Relationships, versions, usage, approval as first-class.** Assets link to each other
   (`derived_from`, `version_of`, `supersedes`, …), carry a `version` string, append a `usage_history`,
   and track an `approval` state — so the catalog is a living graph, not a flat list.
5. **Search indexing is built in.** Each asset's keywords are derived from its name/description/tags,
   and the persisted table has a generated `search_tsv` for full-text — the in-memory engine and the
   database share the same indexing intent.

## Consequences
- **Positive:** a single place to find any asset across the whole operation; global discovery without
  permission leaks; assets compose with the rest of the system (businesses, GitHub Intelligence, the
  tenancy roles); the relationship graph and usage history make provenance and reuse visible.
- **Cost:** permission filtering is role-based (owner/admin/member/viewer) plus a sensitive/private
  flag — not per-asset ACLs; relevance is keyword overlap, not semantic; the `location`/secret
  indirection means the catalog knows *where* a secret is, which is itself worth protecting (hence the
  sensitive gate + RLS).
- **Mitigation:** per-asset ACLs and semantic search can be added behind the same `search()` API;
  tenant RLS plus the application-layer gate is the standard two-layer model; secret refs keep the
  blast radius small.

## Alternatives considered
- **A separate library per asset type:** reintroduces "where does this go / where do I look", the
  opposite of one global catalog. Rejected.
- **Global search ignoring permissions, filter in the UI:** leaks the *existence* (and often the
  location) of sensitive assets. Rejected — filtering happens in the engine before results leave it.
- **Store asset payloads in the catalog:** turns the catalog into a file store and a secret store.
  Rejected in favor of `location` references.
