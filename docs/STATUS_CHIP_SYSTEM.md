# Status Chip System

One vocabulary for state across the whole OS. Implementation: `.pill.*` + `.dot.*` in `theme.css`;
helpers `statusPill/compDot/classPill/gatePill` in `app.mjs`. Rule zero: **color is semantic, never
decorative** — gold means "attention/decide", green means "healthy/approved", amber means "waiting",
red means "risk/blocked/denied", navy(emerald) means "identity/category", gray means "inactive".

## Chip classes

| Class | Meaning | Examples |
|---|---|---|
| `.pill.green` | healthy · approved · open · succeeded | agent active, gate approved, workflow open |
| `.pill.amber` | waiting on a human | pending approval, submitted gate, in_review |
| `.pill.red` | blocked · denied · high-risk class | blocked agent, denied request, `send_contract`/`change_pricing` |
| `.pill.gold` | decide/attention · scope | authority level, P1 priority, "running", ai_generated |
| `.pill.navy` | identity/category (emerald) | department, platform, packet version, stage |
| `.pill.gray` | inactive · draft · not submitted | standby, draft, not_submitted |

## Domain mappings (canonical)

| Domain | States → chips |
|---|---|
| Agents | active→green · standby→gray · blocked→red |
| Companies | dot green/amber/red/gray + stage word |
| Approvals | pending→amber · approved→green · denied→red · expired→gray |
| Gates (studio) | not_submitted→gray · pending→amber · approved→green · denied→red |
| Action classes | `internal_action`→gray · money/contracts/pricing→red · everything external→amber |
| Packets | draft→gray · submitted→amber · (approved go-ahead read from its approval) |
| Avatar jobs | approved_for_generation→navy · in_review→amber · published→green · +`ai_generated`→gold always |
| Publishing | ready_manual→green · scheduled→navy |

## Rules

1. A chip is one word (two max), lowercase, 10.5px/700, letterspaced.
2. Never two chips of the same color adjacent — merge or drop one.
3. Dots always pair with a word (color-blind safety); chips never rely on color alone.
4. New states extend THIS file first, then the helpers — no ad-hoc pill colors in views.
