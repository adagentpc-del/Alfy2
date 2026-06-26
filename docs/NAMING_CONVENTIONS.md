# Alfy² — Naming Conventions

Consistent names make the system navigable and the registries predictable.

---

## 1. Files & directories
- Directories: `kebab-case` (`agents-sdk`, `module-registry`).
- TypeScript files: `kebab-case.ts` (`approval-gate.ts`); one primary export per file where practical.
- TypeScript test files: `*.test.ts`.
- Python files & packages: `snake_case` (`approval_gate.py`, `alfy_workers`).
- Python test files: `test_*.py`.
- Markdown docs: `SCREAMING_SNAKE` for top-level standards (`CODING_STANDARDS.md`), `kebab-case` for ADRs
  prefixed `ADR-NNNN-` (`ADR-0001-stack-and-repo-shape.md`).

## 2. Code identifiers
| Kind | TypeScript | Python |
|---|---|---|
| Variables / functions | `camelCase` | `snake_case` |
| Types / classes / interfaces | `PascalCase` | `PascalCase` |
| Constants | `SCREAMING_SNAKE` | `SCREAMING_SNAKE` |
| Files | `kebab-case` | `snake_case` |

- Booleans read as predicates: `isReversible`, `hasApproval`, `is_cached`.
- No abbreviations except the glossary terms. Spell out `tenant`, `decision`, `approval`.

## 3. Registry keys (modules, agents, capabilities)
- **Module id:** single lowercase noun — `finance`, `health`, `projects`.
- **Agent key:** `family.specialty` dotted, lowercase — `research.web`, `draft.text`, `classify.intent`.
- **Capability:** lowercase `snake_case` verb phrase — `plan_cashflow`, `summarize`, `flag_overdue`.
- Keys are stable identifiers; renaming a key is a breaking change requiring a migration + ADR note.

## 4. Database
- Tables: plural `snake_case` — `events`, `agent_registry`, `ai_cache`.
- Columns: `snake_case`; foreign keys `<entity>_id` (`tenant_id`, `event_id`).
- Timestamps: `created_at`, `updated_at` (`timestamptz`).
- Booleans: `is_*` / `has_*`.
- Append-only tables documented as such in the migration.

## 5. Environment variables
- `SCREAMING_SNAKE`, prefixed by domain:
  - `ALFY_` core platform (`ALFY_ENV`, `ALFY_LOG_LEVEL`).
  - `SUPABASE_` datastore (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
  - `AI_` model controls (`AI_ENABLED`, `AI_FEATURE_<NAME>`, `AI_DEFAULT_MODEL`).
- Feature flags: `AI_FEATURE_<NAME>` or `FLAG_<NAME>`, value `true`/`false`.
- Every variable appears in `.env.example` with a comment and safe placeholder.

## 6. Contracts & schemas
- Schema names in `packages/shared`: `PascalCase` matching the concept — `Task`, `SignalToAction`,
  `ModuleManifest`, `AgentRegistration`.
- Versioned types append a version when they break: `TaskV2` (prefer additive changes to avoid this).

## 7. Branches & commits
- Branches: `phase-N/short-topic` or `type/short-topic` (`feat/agent-registry`).
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).

## 8. Tracing & logging fields
- Always include `trace_id`, `tenant_id`. Use `event_type` for event names in `SCREAMING_SNAKE`
  (`AGENT_DISPATCHED`, `APPROVAL_REQUESTED`, `AI_CACHE_HIT`).
