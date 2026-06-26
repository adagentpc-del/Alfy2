# Phase 2 — Runtime Layer Plan

Turns Alfy² from "schema is live + engines compute in memory" into "connect a real account and watch engines read/write the live database." Decisions below are locked; build the bricks in order.

## Locked decisions
- **Auth:** Supabase Auth (same platform as the database; email + Google sign-in).
- **First vertical slice:** **Move Mi + email**. Inbound email → an `inbox_items` row
  (`item_type='email'`, `category='business'`, `suggested_business='Move Mi'`, a `next_action`) →
  the Executive Inbox engine triages it. Everything else follows the same pattern once this works.

## What's done
- **DB live:** 223 migrations applied to Supabase project `oxromxpjoiifvamxjluz` (157 tables, RLS on,
  464 policies); default operator tenant `00000000-0000-0000-0000-000000000001` seeded.
- **Brick 1 — persistence pattern (`@alfy2/db`):** `Db.withTenant(tenantId, fn, businessId?)` opens a
  pg transaction and sets `app.tenant_id` (+ optional `app.business_id`) as a LOCAL GUC so RLS
  enforces isolation; `PgMemoryRepository` implements the core `MemoryRepository` port over
  `memories`/`memory_links`. `pg` is isolated to `@alfy2/db` (core stays infra-free). Verified by
  `tsc -b` + `scripts/db-smoke.mts` (`pnpm run db:smoke`).

## Next bricks (in order)
2. **Persist the Executive Inbox (the slice's data backbone).** The engine lives in
   `packages/core/src/executive-inbox/inbox.ts` and currently uses an internal `Map`. Extract an
   `InboxRepository` port (like `memory/repository.ts`), ship an in-memory impl + a
   `PgInboxRepository` in `@alfy2/db` over the `inbox_items` table (cols in migration `0010`).
   Verify with `tsc -b` + the inbox smoke rewired to the port + `db:smoke` extended.
3. **`services/api` gateway + Supabase Auth + tenant context.** Verify the Supabase JWT, resolve
   `tenant_id` (single-operator → default tenant) and active `business_id`, then run every handler
   inside `Db.withTenant(...)`. Enforce the Enterprise Security Gate on state-changing routes.
   Endpoints for the slice: ingest an inbox item, list inbox, action an item.
4. **Email connector behind ConnectionsHub.** A real adapter (Gmail or IMAP/Resend-inbound) that
   pulls inbound mail for the Move Mi connection and creates `inbox_items`. Manual-trigger first
   (cost control), polling later if needed.
5. **Thin Set-up-&-Connect UI + Executive Inbox view.** Connect Move Mi's email; see triaged items
   and next actions.

## Guardrails (carry through every brick)
- Cost control: manual AI triggers, cache by content hash, no polling unless required.
- `pg` stays only in `@alfy2/db`; core depends on ports, never infrastructure.
- Every state change passes the Security Gate; every DB unit of work goes through `withTenant`.
- Verify each brick: full `tsc -b` (off-mount), the relevant smoke, and `db:smoke` when DB-backed.
