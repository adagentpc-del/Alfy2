# 16 · Technical Debt

Recorded deliberately (Engineering Standards §22). Debt that weakens security/isolation/data-integrity
is NOT allowed as debt — those are defects.

- **Repository adapters:** only ~8 engines (inbox, approval, mission-control, founder-capacity, revops,
  decision, capital, ai-org runtime) have Pg adapters. The remaining ~170 engines use in-memory Maps.
  Mechanical rollout of the established port→Pg pattern. (Build Queue B1 / task #32.)
- **Orchestrator:** `services/orchestrator` is a scaffold; scheduled cadences/jobs not built.
- **Observability/audit:** structured audit logging + agent metrics not yet wired into the gateway.
- **Production build:** the API runs via `tsx` (TS source) in production — fine for now; a compiled
  build would be more conventional at scale.
- **Lockfile discipline:** keep `pnpm-lock.yaml` in sync when adding deps (a stale lockfile broke the
  first Render deploy). Build uses `--no-frozen-lockfile` as a safety net.
- **Pre-production gates not met:** deployment hardening + observability (Release 8) before public users.
