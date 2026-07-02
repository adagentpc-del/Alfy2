# Build Factory — Spec

The software build factory: how an approved venture (or feature) becomes shipped, verified software.
Scope note: "build factory" here means the **engineering build pipeline**; generating new *agents* is the
Agent Factory (`docs/AGENT_FACTORY.md`, ADR-0005), and the engineering *work queue* is AESL
(`docs/ALFIE2_BUILD_QUEUE.md`).

**Existing machinery:** `build-packet` (migration `0206`), `build-from-brainstorm`,
`conversation-to-code`, `code-handoff`, `builder-mode`, `build-once-reuse`, `batch-once`,
`developer-command-center`, `github-intelligence` (static vetting, never executes), `ship-gate`
(migration `0209`), `implementation-review`, engineering department agents (Build/GitHub/Supabase/Render/
Integration/Debug/QA). Canonical unit: the **build packet**.

## The pipeline

| Stage | What happens | Engine / owner | Gate |
|---|---|---|---|
| 1. Intake | brainstorm/spec/venture-OS output → structured build packet (scope, acceptance, risks, complexity) | `build-from-brainstorm`, `build-packet`; Feature Spec Writer | packet accepted (chain of command) |
| 2. Plan | packet decomposed; reuse checked first (`build-once-reuse` — never build what the Asset Library already has) | Chief Systems Architect | none |
| 3. Build | code produced in small, testable modules per `docs/ALFIE_ENGINEERING_STANDARDS.md` + `CODING_STANDARDS.md`; external repos vetted by GitHub Intelligence before use | Build Agent + `conversation-to-code` | none (internal) |
| 4. Verify | typecheck + smokes + QA pass; implementation review | QA Tester, Debug Agent, `implementation-review` | tests green (hard) |
| 5. Ship gate | ship-gate evaluation: acceptance met, risks addressed, rollback known | `ship-gate` | **gate verdict** |
| 6. Deploy | deploy is a gated action class | Render Agent | **`deploy` approval token** |
| 7. Handoff | code-handoff artifact: what was built, how to run/extend it, saved to Asset Library | `code-handoff`, Documentation Agent | none |
| 8. Learn | outcome + failures recorded; reusable pieces extracted | `failure-database`, `build-once-reuse` | none |

## House build standard (what "built" means here)

Contract first (`packages/shared/src/contracts/<name>.ts`, Zod) → engine (`packages/core/src/<name>/`,
deterministic, tenant-scoped, injectable clock/idFactory) → smoke (`scripts/<name>-smoke.mts`,
`node:assert/strict`) → exports registered in both package indexes → migration pair (tables + RLS) only when
persistence is needed → repository in `packages/db` only when the API needs it. Mock adapters before live
APIs, always.

## Rules

1. No deploy without a green ship gate **and** a consumed `deploy` approval token.
2. Reuse check is mandatory at stage 2 — duplicating an existing engine is a review-blocking defect
   (see the duplication list in `docs/BUILD_AUDIT_CURRENT_STATE.md` §4 for why).
3. Every build packet traces to a venture stage or an AESL task — no orphan builds.
4. Factory KPIs: build turnaround, defect escape rate, reuse rate, ship-gate first-pass rate.
