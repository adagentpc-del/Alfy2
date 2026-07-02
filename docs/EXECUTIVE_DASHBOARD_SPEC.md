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

Luxury enterprise command center on the **Divini Group brand** (2026-07-02; reference: diviniprocure.com
brand direction — cream, deep emerald, gold, Didone serif):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f8f5ee` cream | page base |
| `--surface` | `#fffdf8` | cards |
| `--ink` | `#182420` | primary text |
| `--navy` / `--navy-soft` | `#143829` / `#1e4d3b` deep emerald (var names kept for stability) | sidebar, structure, banners |
| `--gold` / `--gold-bright` | `#a8842c` / `#c2a05a` | luminous accents: active nav, key numbers, primary actions |
| `--gold-soft` | `#f3ecda` | accent washes |
| `--muted` | `#63705f` | secondary text |
| `--line` | `#e8e2d2` | hairlines |
| `--red` | `#a33327` | alerts only |

Purple: none except muted violet knowledge nodes in the brain graph (minimal-purple rule). Typography:
`Playfair Display` (Didone) for wordmark/titles with Didot/Georgia fallbacks, `Montserrat` for
labels/data with system fallbacks — loaded via Google Fonts on the deployed site, degrading cleanly
offline. Density: generous whitespace, 14px radii, hairline borders, letterspaced uppercase micro-labels.

## Wiring rules

1. Mock data is labeled — the Preview banner stays until a view is fully live; mixed views mark live tiles.
2. Every actionable element calls a real route or doesn't render as actionable (no decorative buttons —
   current Approvals buttons violate this and get wired or demoted to text).
3. The dashboard is read + decide only: it approves, acks, escalates, and triages; it never edits domain
   data directly.
4. The app is a build-free static SPA (ADR-0127): `index.html` shell + `assets/{theme.css,data.mjs,
   services.mjs,app.mjs}`, real paths via Vercel rewrite. A framework build requires a superseding ADR.

## Implemented views (2026-07-02, preview data)

`/command-center` (all 8 cards + next-best-action + brain preview + live Connect hook), `/agents`,
`/agents/:id` (full dossier), `/portfolio`, `/portfolio/:id` (Company OS Viewer), `/approvals`
(approve/deny work against local preview state), `/reports/weekly` (generator), `/brain`
(Obsidian-style knowledge graph). Service layer: `apps/web/assets/services.mjs`
(smoke: `pnpm ui:smoke`).

## Sequencing

Wire services.mjs reads to the live API per view (Day 2+, `docs/FIVE_DAY_COMPLETION_PLAN.md`):
Approvals + Inbox first, then Revenue + Org, then Portfolio/Media as their routes land.
