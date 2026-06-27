# 22 · APIs & Integrations

## Internal API — `services/api` (Hono gateway)
Pipeline: `CORS → health (open) → auth → tenant context → approval gate → route`. Every state-changing
risky route is gated (default-deny). All handlers run inside `Db.withTenant(tenantId, businessId, …)`.

**Endpoints (~28):**
- Health: `GET /healthz`, `GET /readyz` (unauthenticated).
- Inbox: `POST /inbox/ingest`, `GET /inbox`, `POST /inbox/:id/status`.
- Actions: `POST /actions/send-email` (**gated** — parks 202 until approved).
- Approvals: `GET /approvals?status=`, `POST /approvals/:id/decide`.
- Mission Control: `GET /mission-control`, `GET /mission-control/brief`,
  `POST /mission-control/alerts/:id/ack|escalate`.
- Founder: `POST /founder/capacity`, `GET /founder/capacity`.
- RevOps: `GET /revops/brief`, `GET /revops/fastest-path`.
- Decisions: `POST /decisions/evaluate`, `GET /decisions`, `POST /decisions/:id/decide`.
- Capital: `POST /capital/allocate`, `POST /capital/runway`, `GET /capital/accounts`.
- AI Org: `POST /org/packets`, `POST /org/packets/:id/accept`, `GET /org/packets`,
  `GET /org/packets/:id/reports`, `POST /org/reports`, `POST /org/reports/:id/review`.

## Authentication
Two modes (config `ALFY_AUTH_MODE`): `jwks` (verify Supabase JWTs via the project JWKS) and `token`
(single shared `ALFY_API_TOKEN` personal access token — used for the hosted dashboard). Send
`Authorization: Bearer <token-or-jwt>`. CORS allows the dashboard origin + `*.vercel.app` + localhost.

## External integrations
- **Supabase** (Postgres + Auth/JWKS). **Render** (API hosting). **Vercel** (dashboard hosting).
- **Connectors** (`ConnectionsHub` engine): adapters are not built yet — email first (Release 3),
  then Slack/socials/CRM/payments. See `docs/CONNECTOR_REGISTRY.md`.

No external rate limits enforced yet; AI features are flag-gated and not enabled in the gateway.
