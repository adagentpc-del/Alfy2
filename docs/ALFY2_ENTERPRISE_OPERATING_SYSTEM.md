# Alfy2 — Enterprise Operating System

Alfy2 is **Alyssa DelTorre's executive AI operating system** for Divini Group and every portfolio company:
the command center, enterprise agent cabinet, venture factory, software build factory, GTM factory, revenue
engine, media studio, AI avatar studio, knowledge brain, automation layer, approval center, and operating
dashboard for every business. It must run like a billion-dollar holding company — while honoring
`NORTHSTAR.md`: the goal is maximum human potential, not maximum automation.

This doc is the **navigational spine** of the enterprise layer. It does not re-specify architecture — the
canonical architecture docs remain `docs/ALFIE2_OPERATIONS_ARCHITECTURE.md` (AOS),
`docs/ALFIE_MASTER_CONTROL.md` (AMC), and `ARCHITECTURE.md`. It maps the fifteen enterprise systems onto
what is actually built (see `docs/BUILD_AUDIT_CURRENT_STATE.md`).

## Naming (settled)

The product is **Alfy2** (styled Alfy²). Code, packages (`@alfy2/*`), env prefix (`ALFY_`), and the live
dashboard (alfy2.vercel.app) already agree. "Alfie2"/"Alfie" in older governance docs is historical
spelling; do not introduce new uses.

## The critical architecture rule

**Alfy2 does not rebuild external tools.** It reproduces their *functional workflows*, generates
**execution packets**, routes work to tools/agents through the connector registry, tracks status, requires
human approval for anything sensitive, and logs outcomes. Concretely:

- Work enters as a **delegation packet** (`ai-org` — "no work without an accepted packet").
- Sensitive actions hit the **approval gate** (`api_approval_requests`, 12 action classes, deny-by-default,
  one-time-consume tokens). Nothing sends email/SMS/posts/avatar video, moves money, or signs contracts
  without an approved token.
- External tools are reached through **connector descriptors** (`connector-registry`) — mock adapters
  first, live adapters only after the mock workflow is proven. No secrets in the repo, ever.
- Every agent action is **logged** (`agent-observability`, accountability ledger) with status.

## The fifteen enterprise systems

| # | System | Canonical spec | Runs on (code) | State |
|---|---|---|---|---|
| 1 | Enterprise Agent Cabinet | `ENTERPRISE_AGENT_CABINET.md` | `packages/core/src/ai-org` (78 role cards), `department-os` | Built (domain) |
| 2 | Agent Title Registry | `AGENT_TITLE_REGISTRY.md` | `ai-org` `DEFAULT_ROLE_CARDS` | Built (seeded) |
| 3 | Agent Authority Matrix | `AGENT_AUTHORITY_MATRIX.md` | `ai-org` permission scopes + `api-approval` + `agent-identity` | Built (domain) |
| 4 | Portfolio Company OS | `PORTFOLIO_COMPANY_OS.md` | `business-profile`, `business`, `portfolio`, `department-os` | Partial |
| 5 | Venture Factory | `VENTURE_FACTORY_SPEC.md` | Builder Mode (ADR-0060), `idea-builder`, `venture-studio` | Partial |
| 6 | Build Factory | `BUILD_FACTORY_SPEC.md` | `build-packet`, `conversation-to-code`, `ship-gate`, AESL queue | Partial |
| 7 | GTM Factory | `GTM_FACTORY_SPEC.md` | **new** `packages/core/src/gtm-factory` | New this change |
| 8 | Revenue Engine | `REVENUE_ENGINE_SPEC.md` | `revenue-command` + `/revops` routes (live), `deal-desk`, `revenue-factory` | Built + wired |
| 9 | Media Studio / Podcast Engine | `MEDIA_STUDIO_SPEC.md` | `media-os`, `content-factory` (42-piece multiplier), `podcast-studio`, `production-studio` | Built (domain) |
| 10 | AI Avatar / Digital Double | `AI_AVATAR_ENGINE_SPEC.md` | `digital-twin`, `voice_personas` (foundations only) | Spec only |
| 11 | Enterprise Setup Engine | `ENTERPRISE_SETUP_ENGINE_SPEC.md` | `business-profile`, domain models `createAll()`, `infra-launch` | Partial |
| 12 | Approval Center | `APPROVAL_CENTER_SPEC.md` | `api-approval` gate + middleware + `/approvals` routes (live) | Built + wired |
| 13 | Knowledge Brain Sync | `KNOWLEDGE_BRAIN_SYNC_SPEC.md` | `memory` (Pg-backed), `knowledge-*`, `source-of-truth` | Partial (no sync) |
| 14 | Automation Orchestration | `AUTOMATION_ORCHESTRATION_SPEC.md` | core `orchestration/*`; `services/orchestrator` (stub) | Spec + core only |
| 15 | Executive Dashboard | `EXECUTIVE_DASHBOARD_SPEC.md` | `mission-control` (live) + `apps/web` | Partial UI |

Agent operations across all fifteen: `AGENT_REPORTING_STRUCTURE.md`, `AGENT_OPERATING_CADENCE.md`,
`AGENT_KPI_SYSTEM.md`. Sequencing: `FIVE_DAY_COMPLETION_PLAN.md`.

## Operating invariants (inherited, non-negotiable)

1. Human approval for: external sends/publishes, money movement, charges, deploys, data deletion,
   contracts, pricing changes, access changes, standing-rule changes, medical/legal/financial claims.
2. Deny-by-default everywhere: RLS on all 245 tables, zero-trust agent identity, gated routes.
3. Mock adapters before live APIs; no live API without a proven mock workflow.
4. No passwords or secrets stored — references only (`ENTERPRISE_SECURITY.md`).
5. Every agent action logged with status (observability + accountability ledger).
6. Small, testable modules: contract (`packages/shared`) → engine (`packages/core`) → smoke (`scripts/`).
