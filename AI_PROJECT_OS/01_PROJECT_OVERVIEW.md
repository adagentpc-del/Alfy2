# 01 · Project Overview

**Alfie2** is an adaptive **executive operating system** — an accountable AI organization that turns a
founder's intent into executed, measurable, revenue-producing systems while the founder stays CEO and
final authority. It is a structured org (CEO → Executive → Department Leaders → AI Employees →
Specialist Agents) where work flows down via delegation, results flow up via reporting, and an approval
gate protects execution.

- **Founder / CEO:** Alyssa DelTorre (sole final authority).
- **Repo:** `adagentpc-del/Alfy2` (GitHub). **Data plane:** Supabase project `oxromxpjoiifvamxjluz`.
- **Live dashboard:** https://alfy2.vercel.app (UI shell). **API:** Render service `alfie-api` (token-auth).

## What it is, in one screen
- A hybrid TypeScript + Python monorepo (contracts-first), see `20_CODEBASE_MAP.md`.
- ~179 deterministic domain engines (`packages/core`), 177 Zod contracts (`packages/shared`), mirrored
  to Pydantic in `workers/`.
- 245 live Postgres tables, every one RLS-secured.
- A runtime API gateway (`services/api`) exposing ~28 endpoints, all tenant-isolated and approval-gated.

## Canonical references
- Why it exists + non-negotiables: `docs/ALFIE_CONSTITUTION.md`
- Full architecture: `docs/ALFIE2_OPERATIONS_ARCHITECTURE.md`
- Navigation hub: `docs/ALFIE_MASTER_CONTROL.md`
- What's next, in order: `docs/ALFIE2_BUILD_QUEUE.md` + `docs/ALFIE_RELEASE_PLAN.md`
