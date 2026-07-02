# Five-Day Completion Plan

Five working days from the current state (see `docs/BUILD_AUDIT_CURRENT_STATE.md`) to a demonstrable
enterprise OS: live API, live dashboard with real actions, one real data flow, one cadence job, and the
enterprise docs registered. Derived from `AI_PROJECT_OS/12_TASK_QUEUE.md`; that file remains the live
tracker — update both as days close.

**Definition of done for the week:** Alyssa opens the dashboard, sees real (or seeded-demo) numbers,
approves a parked action that then executes, reads a daily brief the orchestrator produced on its own, and
every one of those events is visible in the logs.

## Day 1 — Deploy green + connected (ops-heavy, human-in-the-loop)

1. Render re-sync `alfie-api` (lockfile fix is in) → set env vars (`ALFY_API_TOKEN`, `DATABASE_URL`,
   `SUPABASE_URL`) → `/healthz` returns ok. *(Owner: Alyssa + AI; blocker: Render dashboard access)*
2. Delete the old erroring Python `Alfy2` Render service (known issue).
3. Dashboard `Connect` → live Mission Control tiles against the (empty) live DB.
4. **Demo seed**: script inserting the canonical roster companies (`docs/PORTFOLIO_COMPANY_OS.md`) +
   sample deals/alerts/approvals/inbox items behind an explicit `--demo` flag — live mode stops reading $0.
   *Risk: none to prod (flagged, tenant-scoped).*

## Day 2 — The dashboard acts (UI wiring)

1. Wire **Approvals** view: list from `GET /approvals`, decide via `POST /approvals/:id/decide` —
   the demo moment is approving a parked `send-email` request end-to-end (202 → approve → token consumed).
2. Wire **Inbox** view (`/inbox` list + status changes) and alert ack/escalate buttons.
3. Apply remaining dashboard-spec polish (view titles, live/preview labeling per tile).
   *Test: gateway smoke + manual click-through. Risk: low — one static file.*

## Day 3 — First real data flow (Release 3 slice)

1. Move Mi email connector, **mock adapter first**: fixture emails → `POST /inbox/ingest` → triage →
   inbox view. Prove the workflow shape.
2. Live IMAP/Gmail adapter behind the proven mock (creds via env; read-only scope; approval untouched —
   ingest is `internal_action`). *(Blocker: creds from Alyssa; mock path is the fallback demo)*
3. Wire Revenue tab (`/revops/brief`, `/revops/fastest-path`) — fastest-path-to-cash on screen per business.

## Day 4 — The machine runs itself (orchestrator v0)

1. `services/orchestrator` skeleton + scheduler + **daily-brief job** (idempotent per tenant+date) per
   `docs/AUTOMATION_ORCHESTRATION_SPEC.md`.
2. Approval-expiry sweep job. Orchestrator health (last tick) onto Mission Control.
3. Wire Org tab: packets awaiting acceptance, reports awaiting review — the cabinet visible.
   *Test: run scheduler twice for same period → exactly one brief.*

## Day 5 — Enterprise hardening + demo dress rehearsal

1. GTM factory: expose `plan()` via `POST /gtm/plan` (internal_action) and demo a launch plan for one
   roster company; confirm execution packets carry approval classes.
2. Register the 21 enterprise docs in `docs/DOCUMENTATION.md` + Master Control; refresh
   `AI_PROJECT_OS/10_CURRENT_STATE.md` + `13_CHANGELOG.md`; update stale counts in AMC/Release Plan.
3. Full pass: `pnpm typecheck` + all touched smokes + the 10-scenario gateway smoke.
4. Dress rehearsal of the demo narrative: inbox → packet → work → approval → action → log → brief.

## Explicitly deferred (next cycle)

Avatar engine build (spec ready), knowledge-sync adapters (spec ready), setup-engine runner, specialist
roster seeding, remaining Pg adapters, CI aggregate smoke runner, live Stripe/GHL/Apollo connectors.

**Standing risks:** Render/env access is the only hard external dependency (Day 1); everything else
degrades gracefully to mock/demo mode. No step sends anything externally without the existing gate.
