# Design System — Alfy2 Enterprise Command Center

The single source of truth for how Alfy2 looks and moves. Implementation:
`apps/web/assets/theme.css` (all tokens live there — this doc explains, the CSS decides).
Companions: `UI_COMPONENT_GUIDE.md` · `EXECUTIVE_DASHBOARD_COMPONENTS.md` · `STATUS_CHIP_SYSTEM.md` ·
`ENTERPRISE_NAVIGATION_STRUCTURE.md` · `PORTFOLIO_COMPANY_VIEW.md`.

## Principles

1. **Executive decision-making first.** Every screen answers "am I okay and what needs me?" in three
   seconds — the executive strip (nine facts) sits above the fold on every view.
2. **High-status holding company, not a generic dashboard.** Divini Group brand: cream, deep emerald,
   luminous gold, Didone serif. No clutter, no childish gradients, no decoration that isn't information.
3. **Chrome recedes, decisions advance.** Gold is reserved for what matters now (active nav, key
   numbers, primary actions, recommended decisions). Everything else is quiet.

## Tokens (values in `theme.css` `:root`)

| Group | Tokens | Notes |
|---|---|---|
| Base | `--bg` cream `#f8f5ee` · `--surface` `#fffdf8` | warm ivory, never pure gray |
| Structure | `--navy` `#143829` · `--navy-soft` `#1e4d3b` (Divini emerald; var names kept for stability) · `--ink` `#182420` | sidebar, banners, drawer header |
| Accent | `--gold` `#a8842c` · `--gold-bright` `#c2a05a` · `--gold-soft` `#f3ecda` | the *only* attention color |
| Status | `--green/--amber/--red` + soft washes | semantic only — see STATUS_CHIP_SYSTEM |
| Special | `--violet` `#8b7fb8` | knowledge nodes in the brain graph only (minimal-purple rule) |
| Shape | `--radius:14px` · `--shadow` (one soft ambient + tight contact) | never stacked drop-shadows |

## Typography

- **Display (`--serif`)**: Playfair Display → Didot → Georgia. Wordmark, `h1`, decision text, pull quotes.
- **Text (`--sans`)**: Montserrat → system. Body 13–13.5px, secondary 11–12px.
- **Micro-labels**: 9–11px, 700, letterspacing `.1–.16em`, uppercase, muted — the signature detail.
- Numbers use `.mono` (tabular-nums). Fonts load from Google Fonts on the deployed site and degrade
  cleanly offline (fallbacks are always declared).

## Spacing & layout

4px base. Cards pad 14–18px; page gutter 30–36px; grid gaps 14–16px; sidebar fixed 248px; content
max-width 1180px. One `h1` per screen; sections separated by `.sec` hairline headers, never boxes in
boxes. Every grid child gets `min-width:0`; long strings use `overflow-wrap:anywhere`.

## Motion (§the fancy part, kept adult)

Calm, brief, one direction — never bouncy:
- **Entrance**: cards/metrics/strips rise 8px + fade over 450ms (`cubic-bezier(.22,.7,.3,1)`), staggered
  40ms per sibling, capped at 200ms total delay.
- **Navigation**: active item gets a gold bar that scales in (220ms); hover states 150ms.
- **Buttons**: 1px lift on hover, return on press.
- **Drawer**: slides from the right (320ms) with a scrim fade.
- **Brain graph**: the one continuous animation — force-directed constellation on the emerald field.
  Nothing else loops.
- **Loading**: shimmer skeletons (`.skel`), 1.2s linear.
- **`prefers-reduced-motion`**: everything above turns off. Non-negotiable.

## Hard rules

No pure white/black; no blue-link default (links are gold, weighted); no more than one gold CTA per
card; no decorative icons; empty states are serif-italic with the ✧ mark and always say what to do next;
every actionable element calls a real function or doesn't render as actionable.
