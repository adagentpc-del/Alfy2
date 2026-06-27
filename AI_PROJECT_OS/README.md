# AI Project OS — Alfie2

The **permanent operating memory** for this repository. The repo — not any chat conversation — is the
source of truth. Any AI (Claude Chat, Claude Code, ChatGPT, Gemini, Cursor, local models) or human
should be able to read this folder and immediately understand the project, continue work, and update
state, without relying on prior conversations.

This structure is generic and reusable: copy `/AI_PROJECT_OS` into any future project and re-populate.

## How every AI must use it

**Read first (always), in order:**
1. `01_PROJECT_OVERVIEW.md`
2. `04_SYSTEM_ARCHITECTURE.md`
3. `10_CURRENT_STATE.md`
4. `11_ACTIVE_SPRINT.md`
5. `12_TASK_QUEUE.md`
6. `14_DECISIONS.md`

**Then:** analyze the repository and the existing implementation before doing anything. Never assume.
Do only the requested work; do not redesign existing systems unless explicitly told to (see
`ARCHITECTURE_FREEZE` referenced in `14_DECISIONS.md`).

**Update after completing work (always, if applicable):**
- `10_CURRENT_STATE.md` (status, blockers, next task, % complete, last-updated date)
- `13_CHANGELOG.md` (what changed, why, files, risks, next recommendation)
- `12_TASK_QUEUE.md` (move tasks across statuses)
- `11_ACTIVE_SPRINT.md`
- `14_DECISIONS.md` (append, never delete, for any architectural decision)

## Onboarding workflow

**Human:** read README → `01` → `04` → `10`. Skim `docs/ALFIE_MASTER_CONTROL.md` for the full index.
To run it locally: `docs/SETUP_LIVE.md`. To deploy: `docs/DEPLOY_API_RENDER.md` + `DEPLOY_DASHBOARD_VERCEL.md`.

**AI:** follow the Standard AI Workflow in `41_AI_WORKFLOWS.md`. Honor the build/verify gate (full
`tsc -b` + smokes + pytest) before considering anything done.

## Relationship to existing docs
This OS is the **navigation + live-state layer**. The deep canonical documents already live in `/docs`
(governed by `ALFIE_DOCUMENTATION_OPERATING_SYSTEM.md`): the Constitution, Operations Architecture,
Engineering Standards, Build Queue, Release Plan, Master Control. Files here **reference** those rather
than copy them. When canonical content changes, update it there and point here.
