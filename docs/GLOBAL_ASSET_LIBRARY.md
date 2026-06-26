# Alfy² — Global Asset Library

Every business has assets. This is the single, tenant-scoped, **globally searchable** catalog of all of
them — searchable across every business while **maintaining permissions** (private and sensitive assets
are gated). Decision record: [`adr/ADR-0014`](./adr/ADR-0014-global-asset-library.md).

## 24 asset types
logo · brand_guide · domain · social_media · pitch_deck · investor_deck · sales_deck · contract · nda ·
sop · email_template · landing_page · automation · github_repo · api_key · product_spec · video ·
photo · training · pricing · vendor_list · customer_list · marketing_campaign. (A GitHub repo approved
by the GitHub Intelligence System is a `github_repo` asset.)

## Every asset carries
`owner` · `business_id` · `version` · `relationships` · `tags` · `status` · `approval` (+approved_by) ·
`location` · `usage_history` · `keywords` (search index) — plus type, name, description, `sensitive`,
`visibility`, created/updated timestamps.

`location` is a reference (URL, file path, connector ref, secret ref) — **never the secret itself**.

## Global search, permissions maintained
`search(tenantId, query)` ranks across **all** of the tenant's businesses, then filters out anything
the requesting principal may not see — so global discovery never reveals a gated asset:
- **private** → only the owner or an elevated role (owner/admin)
- **sensitive** (e.g. `api_key`) → only an elevated role
- everything else → any grant-holder

The gate reuses the tenancy roles via an injected resolver (the `PermissionChecker`). With no resolver,
single-operator mode grants full access.

## Relationships, versions, usage, approval
Assets link to each other (`derived_from`, `version_of`, `supersedes`, …), carry a `version`, append a
`usage_history` on each use, and track an `approval` state — a living graph, not a flat list.

## API
```ts
const lib = new GlobalAssetLibrary({ roleResolver: (t, p) => permissionChecker.rolesFor(t, p) });
lib.add(tenantId, { type: "pitch_deck", name: "Seed Deck", owner: "you@x.com", business_id: "move-mi", location: "https://…" });
lib.search(tenantId, { principal: "you@x.com", text: "deck" });   // across businesses, permitted only
lib.link(tenantId, deckId, "version_of", oldDeckId);
lib.recordUsage(tenantId, deckId, { actor: "you@x.com", action: "sent" });
```

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/assets.ts` (+ Pydantic mirror) |
| Permission gate | `packages/core/src/assets/access.ts` |
| Library + global search | `packages/core/src/assets/library.ts` |
| Persistent schema | `infra/supabase/migrations/0016_global_assets.sql`, `0017_..._rls.sql` |
| Smoke test | `scripts/global-assets-smoke.mts` (`pnpm run assets:smoke`) |

## Boundaries
- Permission filtering is role-based (owner/admin/member/viewer) + sensitive/private flags, on top of
  tenant RLS; per-asset ACLs and semantic search can be added behind the same `search()` API later.
- The catalog stores `location` references, not payloads or secrets.
