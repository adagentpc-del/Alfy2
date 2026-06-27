# 12 · Task Queue

The authoritative, fully-specified task list (priority, deps, risk, approval, acceptance, complexity) is
**`docs/ALFIE2_BUILD_QUEUE.md`** (36 tasks in 6 groups). This file tracks the *currently open* slice.

| Task | Priority | Status | Owner | Dependencies | Effort | Acceptance | Related files |
|---|---|---|---|---|---|---|---|
| Render `alfie-api` deploy green | P0 | in progress | Alyssa + AI | lockfile fix pushed | S | `/healthz` 200 | `render.yaml`, `services/api/src/main.ts` |
| Set Render env vars | P0 | blocked (needs Alyssa) | Alyssa | service created | S | boots, no crash | Render dashboard |
| Connect dashboard → live API | P0 | pending | Alyssa | API green | S | tiles show live data | `apps/web/index.html` |
| Release 3 — Move Mi email connector | P1 | pending | AI | creds, approval | M | inbound email → inbox_items | `packages/core/connections`, new connector |
| Dashboard: wire revops/decisions/capital/org tabs | P1 | pending | AI | API green | M | tabs show live data | `apps/web/index.html` |
| Orchestrator: daily-brief job | P1 | pending | AI | API green | M | runs on cron, idempotent | `services/orchestrator` |
| Pg adapters for remaining engines | P2 | pending | AI | — | L | each persists; smoke green | `packages/db` |
| Observability + audit logging | P2 | pending | AI | API green | M | every state change audited | `services/api`, `agent-observability` |

**Status legend:** pending · in progress · blocked · done. Update this table as work moves; mirror big
changes into `docs/ALFIE2_BUILD_QUEUE.md`.
