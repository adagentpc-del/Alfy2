# 42 · Automations

## Current
- **CI/verify (manual):** the build/verify gate is run on demand (`tsc -b` + smokes + pytest). No hosted
  CI pipeline yet.
- **Vercel:** auto-deploys the dashboard on push to `main`.
- **Render:** `alfie-api` auto-deploys on push (once green).

## Planned (not yet built)
- **services/orchestrator** scheduled loops: daily CEO brief, daily standups, weekly/monthly/quarterly
  reviews (review-cadence), KPI rollups, follow-up expiry, founder-capacity + runway checks, the
  continuous-improvement nightly pattern pass. All idempotent + cost-batched (no per-minute polling).
- **Connector-driven automations:** inbound email → inbox; outbound (approval-gated) sends; status
  callbacks. See `docs/CONNECTOR_REGISTRY.md`.

## Rules
AI features are flag-gated, manually triggered where possible, cached, and rate-limited. No autonomous
risky execution. Scheduled jobs never bypass the approval gate.
