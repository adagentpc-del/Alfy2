# Approval Center — Spec

The single place where Alyssa sees, decides, and audits everything that needs her. The **gate is already
built and live** — this spec covers the *center*: the surface and operating rules on top of it. It adds no
new approval mechanism.

**Existing machinery (canonical):**
- `api-approval` gate — `packages/core/src/api-approval/` + `services/api/src/middleware/approval-gate.ts`:
  deny-by-default `GATED_ROUTES` registry; ungated requests park as HTTP 202 `approval_required`; tokens
  bound to exact route+method+action class, **consumed one-time**; migration `0239_api_approval_requests.sql`
  (12 action classes, only `internal_action` exempt).
- `persistent-approval` (ADR-0017) — bounded standing grants ("approve once"), with limits/expiry/review.
- Routes (live): `GET /approvals`, `POST /approvals/:id/decide`. Repo:
  `packages/db/src/api-approval-repository.ts`. Smokes: `pnpm apiapproval:smoke`, `pnpm approval:smoke`.

Action classes and who approves what: `docs/AGENT_AUTHORITY_MATRIX.md`.

## The center (UI spec — Approvals view, `apps/web`)

One queue, three-second comprehension per item:

| Element | Content |
|---|---|
| Header line | action class badge (color-coded by risk) · requesting agent title · business |
| The ask | one sentence: *what will happen if you approve* — never jargon |
| Evidence | the exact draft/diff/amount/recipient; for avatar renders, the preview |
| Impact line | reversible? cost? who's affected? deadline? |
| Decisions | **Approve** (mint token) · **Deny** (with reason) · **Approve + remember** (persistent-approval grant buttons: this business / 30 days / until goal / review monthly) |
| Trail | who asked, when, prior similar decisions (from decision journal) |

Queue order: money/contracts first, then deadline proximity, then age. Batch-decide allowed only within
one action class. Every decision writes to the accountability ledger and agent observability.

**Current UI gap:** the Approvals view exists but its buttons are decorative — wiring them to
`GET /approvals` + `POST /approvals/:id/decide` is Day-2 work in `docs/FIVE_DAY_COMPLETION_PLAN.md`.

## Operating rules

1. **Everything sensitive flows through here** — email/SMS/posts/avatar video/payments/contracts have no
   other path (the middleware is global; adding a gated route = one entry in `GATED_ROUTES`).
2. Parked requests expire; expired ≠ approved. Silence never authorizes anything.
3. Standing grants are visible in the center with usage counts and next-review dates; one click revokes.
4. The queue size is a founder-protection KPI: if daily approvals exceed the founder-capacity threshold
   (`founder-capacity`, R5), the system recommends new standing grants or narrower agent scopes — the
   center must shrink itself, not train Alyssa to rubber-stamp.
5. Approving from the center is the **only** way tokens are minted. No API backdoor mints tokens.

## Near-term hardening (after UI wiring)

Register the remaining gated route surface as actions gain HTTP endpoints (today only
`POST /actions/send-email` is registered); add expiry sweep to the orchestrator's daily job; surface
approval-latency on Mission Control.
