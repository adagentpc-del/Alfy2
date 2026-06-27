# 14 · Decisions (Architectural Decision Log — append-only, never delete)

| Date | Decision | Reasoning | Alternatives considered | Long-term implications |
|---|---|---|---|---|
| 2026-06-26 | **Architecture Freeze v1.0** until the first slice ships | Stop feature sprawl; ship runtime | keep expanding | Only bugs/contradictions/deps/security/perf/impl-discoveries allowed. See `docs/ARCHITECTURE_FREEZE.md` |
| 2026-06-26 | **Contracts-first** (Zod in shared, mirrored to Pydantic) | One legal cross-boundary surface | per-service types | Cross-language parity; barrels must stay collision-free |
| 2026-06-26 | **Tenant isolation via RLS GUC** (`app.tenant_id`), deny-by-default | Isolation by construction, fail-closed | app-layer filtering | Every table needs RLS; unset context sees nothing |
| 2026-06-26 | **`pg` isolated to `@alfy2/db`** | Keep core infra-free/testable | pg in services | Engines depend on repository PORTS only |
| 2026-06-26 | **Apply migrations directly (Supabase MCP), GitHub→Supabase auto-deploy OFF** | Auto-deploy failed (numbered versions + non-idempotent policies) | rename all migrations + idempotent | Migrations applied/verified one-by-one. See `docs/DEPLOYMENT.md` |
| 2026-06-26 | **Supabase Auth (JWKS)** as the production auth | Standard, secure | custom auth | Gateway verifies JWTs via SUPABASE_URL JWKS |
| 2026-06-27 | **Token auth mode** for the hosted API (single personal token) | Let the dashboard read live data without building a login flow | full Supabase login UI | Single-operator; switch to `jwks` for multi-user. Token never in repo/page |
| 2026-06-27 | **UI shell on Vercel (static) + API on Render (Node)** | Fastest path to a live, shareable product | host both on one service | UI mock-first → Connect to live API; CORS allows the dashboard origin |
| 2026-06-26 | **Money is recommend-only; Alfie never moves money** | Constitution non-negotiable | autonomous execution | Capital Allocation `approved=false` always; founder executes |

Add a row for every major decision. Do not delete prior rows.
