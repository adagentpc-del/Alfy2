# Portfolio Company View

How a company is presented everywhere it appears — the visual contract for the roster in
`PORTFOLIO_COMPANY_OS.md`. Screens: `/portfolio` (gallery) and `/portfolio/:id` (Company OS Viewer),
implemented in `app.mjs` (`viewPortfolio`, `viewCompanyOS`).

## Gallery card (`/portfolio`)

```
[kind chip]                    [status dot + stage]
Company Name (serif)
2-line summary
$MTD ────────gold bar──────── $target
priority · N campaigns · blocks · operating agent
──────────────────────────────
FASTEST PATH   one sentence, verbatim from the OS
```
Order: fixed roster order (parent first) — not sorted by health, so the eye learns positions.
Click anywhere → the OS Viewer.

## Company OS Viewer (`/portfolio/:id`)

1. **Header**: crumb → serif name → status dot + priority (gold) + stage chips → summary line.
2. **Executive strip** — the nine facts, company-scoped (owner = operating agent; decision = top
   pending approval for this business, else fastest path).
3. **NBA banner**: fastest path to cash + "Decide N pending" CTA when approvals wait.
4. **Metrics**: Revenue MTD (goldline) · departments active x/13 · SOP coverage % · asset checklist %.
5. **Main column**: Operating System card (bars + playbooks + connected tools chips — live tools green,
   blueprints gray) · Workflows (open green / blocked red) · Weekly focus (serif quote).
6. **Rail**: Operating agent card (status, mission, next action, dossier link) · Active campaigns ·
   Approvals for this business (drawer-enabled, decidable in place) · Action log slice.

## Rules

1. The fastest path to cash is **always visible without scrolling** — it is the reason the screen exists.
2. Pre-revenue companies show "pre-revenue", never $0 (zeros read as failure; absence reads as stage).
3. Blocked workflows always name the blocker, not just a count.
4. The parent (Divini Group) shows the roll-up but is excluded from portfolio sums (no double-count).
5. Every fact on this screen traces to a data object (`portfolio_companies`,
   `company_operating_systems`, `approval_requests`, `action_logs`) — no hand-typed numbers in views.
