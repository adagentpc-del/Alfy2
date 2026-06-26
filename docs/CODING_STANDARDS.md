# Alfy² — Coding Standards

These rules keep the system modular, explainable, and cheap. They apply to all code unless a doc
explicitly overrides them.

---

## 1. Boundaries (the most important rule)
- Code may only cross a boundary through a **contract** in `packages/shared`.
- Allowed dependency direction: `services` → `core` → `config`/`shared`; `shared` imports nothing internal.
- **Never:** module ↔ module imports, agent ↔ orchestrator imports, anything → `services`.
- A lint rule enforces this; a violation fails CI. If you need a new cross-boundary call, define a
  contract first.

## 2. Explainability by construction
- Every action-producing function returns a **Signal→Action** envelope with a non-empty `explanation`.
- No "silent" side effects: anything that changes state also writes an `event`.
- Prefer returning data + rationale over performing hidden work.

## 3. Modules & agents
- A module owns no infrastructure; it requests work via Tasks.
- An agent is stateless between tasks and side-effect-free except via returned `next_actions`.
- Adding a capability = declaring it in the manifest/registration first, then implementing.

## 4. AI usage
- Model calls go **only** through `packages/core/ai`. Direct SDK calls are rejected in review.
- Guard every AI feature behind `AI_ENABLED` and an `AI_FEATURE_<NAME>` flag.
- Cache by content hash; respect `Task.budget`; record `ai_usage`.

## 5. TypeScript
- `strict: true`. No `any` (use `unknown` + narrowing). No non-null `!` on external data.
- Validate all external input with Zod at the boundary; trust types only after validation.
- Pure functions where possible; isolate I/O at the edges.
- `async/await` only; no floating promises (lint-enforced).
- Errors: throw typed errors; never swallow. Wrap with context before rethrowing.
- Format with the repo Prettier config; lint with ESLint. CI runs both.

## 6. Python (workers)
- Type hints required; checked with a type checker (mypy/pyright). Public functions fully typed.
- Validate inputs/outputs with Pydantic models mirroring the shared contracts.
- No global mutable state; workers are request-scoped.
- Format with Ruff/Black; lint with Ruff. CI runs both.
- Raise explicit exceptions; map them to a `SignalToAction` error result at the worker edge.

## 7. Errors, logging, observability
- Structured JSON logs, one event per line, always carrying `trace_id` and `tenant_id`.
- No secrets or full payloads in logs; log identifiers and shapes, not contents.
- Every caught failure becomes an `event`; never `catch` to ignore.

## 8. Data & safety
- Every persisted row sets `tenant_id`; never query across tenants.
- Irreversible actions must flow through the Approval Gate — modules cannot opt out.
- No raw SQL string interpolation; use parameterized queries / the data layer.

## 9. Tests
- New contract ⇒ contract test (TS + Python sample validation).
- New boundary ⇒ it must pass the boundary lint.
- Keep tests deterministic; no live network in unit tests.

## 10. Commits & reviews
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Small PRs, one concern each; describe *what changed and why*.
- A PR that adds a feature without a defined contract is not mergeable.
- Update `CHANGELOG.md` when behavior or structure changes.

## 11. Comments & docs
- Comment the *why*, not the *what*. Keep public contracts documented in `packages/shared`.
- Update the relevant doc in the same PR as the code change.
