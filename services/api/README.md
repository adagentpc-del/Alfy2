# @alfy2/api — runtime gateway

The HTTP surface for Alfie2. Every request: verify identity → resolve tenant (+ optional business) →
run inside a tenant-scoped DB transaction → pass state-changing risky routes through the **approval
gate** (default-deny) → call an engine. No business logic lives here; handlers compose engines.

## Pipeline
`health (open) → auth (Supabase JWT) → tenant context → approval gate → routes`

## Routes (Release 0)
- `GET /healthz`, `GET /readyz` — unauthenticated liveness.
- `POST /inbox/ingest` — drop content → Executive Inbox processes + persists. Returns the routed item.
- `GET /inbox?status=&limit=` — list inbox items (newest first).
- `POST /inbox/:id/status` — advance an item's workflow status.
- `POST /actions/send-email` — **gated** (`send_message`). Returns `202 approval_required` + an
  `approval_id`; re-call with `?approval_id=<id>` after approval to proceed. (No real send yet —
  the email connector arrives in Release 3.)
- `GET /approvals?status=pending` — the founder's approval queue.
- `POST /approvals/:id/decide` — `{status:"approved"|"denied", reason?}`.

## Run it live
1. Fill `.env` at the repo root (see `.env.example`): `DATABASE_URL` (Supabase pooler string),
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALFY_DEFAULT_TENANT_ID`
   (`00000000-0000-0000-0000-000000000001`). `ALFY_API_PORT` defaults to 8080.
2. From `services/api`: `pnpm dev` (runs `src/main.ts`). It refuses to start without `DATABASE_URL`.
3. Auth: send `Authorization: Bearer <supabase-jwt>`. Tokens are verified against the project JWKS;
   the gateway never sees or stores any secret.

## Verify without a DB
`tsx scripts/api-gateway-smoke.mts` runs the whole pipeline in-process over in-memory repos with a
locally-signed token — no network, no database, no port. Asserts 401s, inbox round-trip, and the
gate parking at 202 then clearing to 200 after approval.

## Boundaries
- `pg` is never imported here; persistence goes through `@alfy2/db` (`Db.withTenant`).
- The gate defaults to deny. Adding a new state-changing route means registering it in
  `middleware/approval-gate.ts` with its action class — see `ALFIE_ENGINEERING_STANDARDS.md` §8, §36.
