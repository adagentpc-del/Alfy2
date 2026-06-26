# Alfy² — Technical Specification (Foundation)

Concrete technical decisions that implement [`ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 1. Languages & runtimes

| Area | Choice | Version floor |
|---|---|---|
| Orchestration core, API, shared libs | TypeScript | Node 20 LTS |
| Agent workers | Python | 3.12 |
| Package mgmt (TS) | pnpm workspaces | pnpm 9 |
| Package mgmt (Py) | uv | latest |
| DB / Auth / Storage | Supabase (Postgres 15) | — |

Rationale recorded in [`adr/ADR-0001-stack-and-repo-shape.md`](./adr/ADR-0001-stack-and-repo-shape.md).

## 2. Monorepo layout (workspaces)

- `packages/*` — publishable-style TS libs (no long-running process).
  - `shared` — types, Zod schemas, the Signal→Action + Task contracts. **Depends on nothing internal.**
  - `config` — layered config loader + schema validation.
  - `core` — kernel: registries, planner interface, dispatcher, approval gate, log writers.
  - `agents-sdk` — TS-side helpers to define/register agents and build Task envelopes.
- `services/*` — deployable TS processes.
  - `api` — HTTP gateway: authn/z, tenant resolution, rate limiting, validation.
  - `orchestrator` — planner + dispatcher + assembler + log writer.
- `workers/*` — Python agent workers (uv project). One subpackage per agent family.
- `modules/*` — domain modules (manifests + handlers). Scaffolds only this phase.
- `infra/*` — Supabase migrations, seed, environment descriptors.

Dependency direction: `services` → `core`/`config`/`shared`; `core` → `config`/`shared`;
`shared` → nothing internal. Enforced by lint boundaries (see CODING_STANDARDS §boundaries).

## 3. Contracts (the only cross-boundary surface)

All contracts are defined once in `packages/shared` as **Zod schemas** (TS) mirrored by **Pydantic
models** (Python) generated/kept in lockstep. The wire format is JSON.

### 3.1 Task (core → agent)
```jsonc
{
  "task_id": "uuid",
  "tenant_id": "uuid",
  "agent": "research.web",        // registry key
  "capability": "summarize",      // requested capability
  "input": { /* schema per capability */ },
  "budget": { "max_tokens": 0, "max_cost_usd": 0, "timeout_ms": 0 },
  "trace_id": "uuid"              // ties to Event Log
}
```

### 3.2 SignalToAction (agent/module → core)
See [`ARCHITECTURE.md`](../ARCHITECTURE.md) §3.3. Always includes `explanation`.

### 3.3 Module manifest
```jsonc
{
  "id": "finance",
  "version": "0.1.0",
  "capabilities": ["plan_cashflow", "flag_overdue"],   // declared, not implemented yet
  "requires_agents": ["research.web", "draft.text"],
  "owner": "founder",
  "irreversible_capabilities": ["send_payment"]         // forces approval gate
}
```

### 3.4 Agent registration
```jsonc
{
  "key": "research.web",
  "runtime": "python",
  "endpoint": "http://workers-research:8081/run",  // or queue topic
  "capabilities": ["search", "summarize"],
  "version": "0.1.0"
}
```

## 4. Transport

- **Now:** synchronous HTTP between orchestrator and workers (simplest, cheapest, debuggable).
- **Designed for:** a queue (e.g. Postgres-backed job table, then a broker) — the Dispatcher hides
  transport behind an interface so switching is a config change, not a code rewrite.

## 5. Data model (platform tables — created by migration, no business rows)

| Table | Purpose | Notes |
|---|---|---|
| `tenants` | tenant root | one row in single-operator mode |
| `module_registry` | installed modules + manifest | |
| `agent_registry` | installed agents + endpoints | |
| `events` | append-only event log | immutable; `trace_id` index |
| `decisions` | planner choices + rationale | FK → events |
| `approvals` | pending/resolved gates | status: pending/approved/rejected |
| `memory` | operator profile/context | audited writes |
| `ai_cache` | content-hash → cached AI output | TTL + hash unique |
| `ai_usage` | per-call tokens/cost/model | for budgets & reporting |
| `audit_log` | security-relevant actions | who/what/when |

Every table: `id uuid pk`, `tenant_id uuid not null`, `created_at timestamptz`, RLS enabled.
`events` and `audit_log` are **append-only** (no UPDATE/DELETE grants).

## 6. Configuration

Layered precedence (lowest → highest): packaged defaults → environment file → process env →
runtime feature flags. Validated against a schema at boot; **boot fails on invalid/missing required
config**. Secrets only via env, never committed. Full spec: [`CONFIG_SYSTEM.md`](./CONFIG_SYSTEM.md).

## 7. AI usage controls

- Global flag `AI_ENABLED=false` by default.
- Per-feature flags `AI_FEATURE_<NAME>=false`.
- All calls go through a single `ai/` gateway in `packages/core` that: checks flag → checks
  `ai_cache` by content hash → enforces `budget` → records `ai_usage`. No agent calls a model directly
  outside this gateway.

## 8. Observability

- Structured JSON logs (one event per line), correlated by `trace_id`.
- `/healthz` (liveness) and `/readyz` (readiness: config valid + DB reachable + registries loaded).
- Errors never swallow context; every failure is an `event` row.

## 9. Testing strategy (foundation)

- **Contract tests** — schemas validate sample payloads in both TS and Python.
- **Boundary tests** — lint rule fails on illegal cross-imports.
- **Boot test** — `pnpm run check` validates config + manifests parse + registries resolve.
- No feature tests yet (no features).

## 10. Security baseline

- Least-privilege Supabase keys; service-role key only in server processes, never shipped to clients.
- RLS on by default; deny-by-default policies.
- Input validated at the API boundary before reaching core.
- Irreversible actions cannot bypass the Approval Gate (enforced in Dispatcher, not in modules).
Full doc: [`SECURITY.md`](./SECURITY.md).
