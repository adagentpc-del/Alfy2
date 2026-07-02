# Executive Dashboard — Spec

Alyssa's command surface. This spec **reconciles the three overlapping dashboard concepts** and sets the
UI direction. Canonical read-model: **Mission Control** (`packages/core/src/mission-control/` — engine +
alerts + Pg read-model + live routes, migration `0240`). `control-tower` (ADR-0027) and `flight-deck`
(ADR-0113) remain as domain read-models whose best tiles fold *into* Mission Control views —
no fourth dashboard concept may be introduced.

## Views (target)

| View | Content | Backing (exists today) |
|---|---|---|
| Mission Control (default) | revenue today · cash · runway · founder capacity · needs-you · alerts · top-3 · department health · active builds | `GET /mission-control` (live), alerts ack/escalate (live) |
| Approvals | the Approval Center queue (`docs/APPROVAL_CENTER_SPEC.md`) | `GET /approvals` + decide (live, unwired) |
| Inbox | triaged executive inbox | `/inbox` routes (live, unwired) |
| Portfolio | one row per roster company: health, revenue, fastest path, rank | revops + portfolio engines (no routes yet) |
| Revenue | revops brief · fastest-path · decisions · capital | `/revops`, `/decisions`, `/capital` (live, unwired) |
| Org | cabinet: packets in flight, reports awaiting review, escalations | `/org` routes (live, unwired) |
| Media | publish queue + approvals for content/avatar renders | media_jobs tables (no routes yet) |
| Founder | capacity, mode, check-in | `/founder/capacity` (live, partially wired) |

Three-second rule per view: the headline answers "am I okay and what needs me?" before any scrolling.

## Design language (applied to `apps/web/index.html` in this change)

Luxury enterprise command center — portfolio-holding-company feel, high-status, no clutter:

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f7f6f2` ivory | page base |
| `--surface` | `#ffffff` | cards |
| `--ink` | `#10233f` deep navy | structure, headers, primary text |
| `--navy-soft` | `#1c3a63` | secondary structure, buttons |
| `--gold` | `#a8842c` | luminous accent: active nav, key numbers, focus states |
| `--gold-soft` | `#f3ecdc` | accent washes, active backgrounds |
| `--muted` | `#5c6672` | secondary text |
| `--line` | `#e7e3d8` | hairlines |
| `--red` | `#a33327` | alerts only |

Purple: none (minimal-purple rule satisfied by absence). Typography: serif display for the wordmark and
view titles (Georgia stack until a licensed face is chosen), system sans for data. Density: generous
whitespace, 12px radii, hairline borders, no drop-shadow stacks, no decoration that isn't information.

## Wiring rules

1. Mock data is labeled — the Preview banner stays until a view is fully live; mixed views mark live tiles.
2. Every actionable element calls a real route or doesn't render as actionable (no decorative buttons —
   current Approvals buttons violate this and get wired or demoted to text).
3. The dashboard is read + decide only: it approves, acks, escalates, and triages; it never edits domain
   data directly.
4. One file (`apps/web/index.html`) stays acceptable until the view count exceeds ~8 or state gets shared;
   then graduate to a real frontend build (decision via ADR, not drift).

## Sequencing

Theme retoken (this change) → wire Approvals + Inbox (Day 2, `docs/FIVE_DAY_COMPLETION_PLAN.md`) →
Revenue + Org tabs (Day 3–4) → Portfolio + Media views once their routes exist.
