# ADR-0001 — Stack & repository shape

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Alfy² is a modular, multi-agent executive OS that must (a) stay cheap to run, (b) let modules and
agents be replaced independently, and (c) grow into the FounderOS SaaS platform without a rewrite.
We needed to fix the language(s), the executor model, and the repository shape before writing any
foundation code.

## Decision
1. **Hybrid language model.** TypeScript (Node 20+) for the orchestration core, API, and shared
   libraries; Python (3.12+) for agent workers.
2. **Monorepo** managed with pnpm workspaces (TS) and uv (Python).
3. **Supabase/Postgres** as the default datastore, auth, and storage.
4. **Contracts-only boundaries:** all cross-boundary communication uses versioned schemas in
   `packages/shared`; no direct imports across module/agent/core lines.
5. **Multi-tenant from day one:** `tenant_id` + RLS on every row.

## Rationale
- TS core gives one language for kernel, API, and the future FounderOS web app — lower cost and
  smaller surface for a small team.
- Python workers tap the strongest AI/agent ecosystem and stay isolated/replaceable.
- A monorepo keeps modular packages evolving together with atomic, reviewable changes.
- Supabase is the cheapest managed option that still provides auth, RLS, and storage.
- Contracts-only boundaries are what make "replace any module without affecting the system" true in
  practice rather than aspiration.

## Consequences
- **Positive:** clean modularity, cheap default infra, clear SaaS path, polyglot agents.
- **Cost:** two toolchains (Node + Python) to install and keep in lockstep; contract definitions must
  be mirrored across Zod (TS) and Pydantic (Python).
- **Mitigation:** schemas live in one place (`packages/shared`) and are validated in both runtimes via
  contract tests; the build plan keeps the Python surface minimal until needed.

## Alternatives considered
- **Pure TypeScript:** simplest ops, weaker AI/agent ecosystem for heavy work. Rejected for agent layer.
- **Pure Python:** strong AI, but needs a second language for the eventual web app and is heavier to
  host. Rejected for the core/API.
- **Polyrepo:** maximum isolation, but heavy coordination overhead for one founder + small team. Rejected.
