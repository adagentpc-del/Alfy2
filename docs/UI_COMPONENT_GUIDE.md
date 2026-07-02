# UI Component Guide

Every reusable piece in the command center, with its CSS class and behavior contract.
Source: `apps/web/assets/theme.css` (styles) + `app.mjs` (render helpers). Tokens: `DESIGN_SYSTEM.md`.

| Component | Class / helper | Contract |
|---|---|---|
| Card | `.card` + `.cardhead` + `.pad` | one concern per card; header is an uppercase micro-label + optional gold link; entrance animation automatic |
| Metric tile | `.metric` (+`.goldline` for the lead metric) | label (micro-caps) → serif number → one-line delta; max 5 per row |
| Executive strip | `execStrip(cells)` | the nine facts (see EXECUTIVE_DASHBOARD_COMPONENTS.md); empty cells drop; decision cell is gold-washed serif |
| Next-best-action banner | `.nba` | emerald gradient band, gold micro-label, serif action sentence, ≤1 CTA; one per screen max |
| Row list | `.row` (+`.rows-tight`) | title + sub-line left, status/value right; hairline separators only |
| Table | `table.kpis` | micro-caps headers, hairline rows, `.mono` numbers, trend glyphs `.trend-up/-down/-flat` |
| Status chip | `.pill.*` | see STATUS_CHIP_SYSTEM.md — semantic colors only |
| Status dot | `.dot.green/amber/red/gray` | company/inline health; always followed by a word for color-blind safety |
| Buttons | `.btn` / `.btn.primary` (emerald) / `.btn.gold` (the decision) / `.btn.danger` | one gold per context; hover lift 1px |
| Approval row | `approvalRow(r, withActions)` | title (click → drawer) + ask + meta + gold impact wash + Approve/Deny |
| Approval drawer | `.drawer` + `openApprovalDrawer(id)` | right slide-in: full ask/impact/evidence/trail + decisions + gate-mechanics footnote; Esc/scrim closes |
| Entity card | `.acard` | agent/company/factory card: chips top, serif title, 2-line mission, hairline "next action" footer; hover lifts + gold border |
| Bar | `.bar`/`.barrow` | gold progress on parchment track; label left, % right |
| Skeleton | `.skel` | shimmer placeholder for anything async (live queue, fonts); never spinners |
| Empty state | `.empty` | ✧ + serif italic + *what to do next* — never just "no data" |
| Gates strip | studio episode header | five gate pills with live status; links to the Approval Center |
| Form field | inline `input/select/textarea` pattern | micro-caps label above, parchment field, 9px radius; forms max-width 660px |
| Drawer scrim | `.drawer-scrim` | emerald-tinted, click-to-close |
| Brain graph | `mountBrain(canvasId, h)` | canvas constellation; founder gold, companies ivory, agents steel, knowledge violet; hover lights edges; click navigates |

## Composition rules

1. Screen = `crumb → h1 + chips → sub → [banner] → execStrip → nba? → content grid`.
2. Grids: `.grid.g2` for detail screens (main 2fr / rail 1fr via `.dossier`), `.cards` auto-fill for
   galleries. Children never overflow (`min-width:0` enforced globally).
3. Interactive = wired. A button that can't act yet renders as text or not at all.
4. Every async region shows a skeleton first, then content or a useful empty state.
5. Mutations re-render the whole view (`render()`) — no partial DOM patching by hand.
