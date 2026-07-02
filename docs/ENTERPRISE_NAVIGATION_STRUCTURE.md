# Enterprise Navigation Structure

The information architecture of the command center. Implementation: sidebar in `apps/web/index.html`,
router table in `app.mjs`. Rule: **two groups, eight items, no nesting** — an executive never hunts.

## Sidebar

```
ALFY2 · Enterprise OS            (gold monogram, serif wordmark, emerald field)

OPERATE                          — what runs daily
  ◎ Command Center               /command-center     (default route)
  ✦ Factory                      /factory            (4 creation modes)
  ◉ Media Studio                 /studio
  ◐ Avatar Studio                /studio/avatar
  ✓ Approvals [badge]            /approvals          (badge = live pending count)
  ▤ Weekly Report                /reports/weekly

ENTERPRISE                       — what the company IS
  ◈ Agent Cabinet                /agents
  ▦ Portfolio                    /portfolio
  ✳ Brain Center                 /brain

footer: preview note · version · Reset demo state
```

Active state: gold text + soft wash + animated gold left bar. The Approvals badge is the only number in
the nav — the queue is the heartbeat.

## Route map (client-side, Vercel rewrite → index.html)

| Route | View | Detail routes |
|---|---|---|
| `/command-center` | executive summary of everything | — |
| `/factory` | creation hub | `/factory/{company,software,gtm,media}` · `/factory/packets/:id` |
| `/studio` | media pipeline | `/studio/episodes/:id` |
| `/studio/avatar` | avatar governance | — |
| `/approvals` | decision queue (live + preview) | drawer per item |
| `/reports/weekly` | operating cadence | — |
| `/agents` | cabinet | `/agents/:id` dossier |
| `/portfolio` | holding view | `/portfolio/:id` OS viewer |
| `/brain` | knowledge graph | node click → agent/company |

## Wayfinding rules

1. **Crumbs** (gold micro-caps) on every screen: `Parent / context`. Detail screens link back.
2. Cross-links are gold + weighted, and always by name (never "click here").
3. Deep links work (rewrite serves the shell; router resolves) — every screen is shareable.
4. Escape hatches: the drawer closes on Esc/scrim; every unknown id renders a useful empty state with a
   route home.
5. New top-level items require updating THIS file first; the nav does not grow past ~10 items — new
   surfaces become detail routes or command-center cards instead.
