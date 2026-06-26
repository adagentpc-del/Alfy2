# @alfy2/api

The ingress service. Responsibilities (Phase 2):
- Authenticate (Supabase JWT) and resolve `tenant_id`.
- Rate-limit per tenant (cost control).
- Validate all input against `@alfy2/shared` schemas before it reaches the core.
- Expose `/healthz` (liveness) and `/readyz` (readiness per `docs/STARTUP_SEQUENCE.md`).
- Forward validated intents to `@alfy2/orchestrator`.

Holds the Supabase service-role key (server-only). Never executes business logic itself.
