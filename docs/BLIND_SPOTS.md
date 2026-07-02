# Blind Spots — What the Vision Is Missing That Nobody Asked For

Advisory record, 2026-07-02. The gaps NOT on the roadmap that would be massive to close — ranked by
how badly each would hurt. Companion to VISION_GAP_AUDIT.md (which tracks the known path).

| # | Blind spot | Why it's massive | Smallest first move |
|---|---|---|---|
| 1 | **Founder single-point-of-failure** — every gate ends at Alyssa; illness = machine halt; no estate-grade credential custody | continuity is what makes a structure an institution | continuity policy: bounded delegated-approval tiers (persistent-approval grants), break-glass runbook, credential custody plan |
| 2 | **The operator is the attack surface** — one bearer token = full authority; phishing/SIM-swap beats all code controls | strongest gates, weakest front door | passkeys jump the queue; token rotation UI; hardware key on email/Render/Supabase/GitHub; personal security audit |
| 3 | **The museum risk (adoption)** — nothing forces real life into the OS | unused systems die beautiful | one-session "amnesty import" of every real open loop; one week of "if it's not in Alfy2 it doesn't exist" |
| 4 | **Trust layer for agent output** — review at scale becomes rubber-stamping | governance dies quietly | approve/revise-WITH-REASON capture feeding the loop; agent-eval lab into the packet path; drafts require confidence + sources |
| 5 | **No first-dollar milestone** — features measured, not caused revenue | proof beats promise | 30 days post-live: one dollar causally attributed to the machine (Move Mi lead → approved draft → Divini Pay link) |
| 6 | **The machine has no P&L** — tokens + VPS + review-minutes are the new COGS | NORTHSTAR demands the OS prove ROI like an employee | monthly one-pager: OS cost vs time returned vs revenue touched (metering already exists) |
| 7 | **Mortal data TODAY** — module state in one browser's localStorage; no tested Supabase restore | a cleared cache erases work now | export-everything (JSON) this week; quarterly restore drill; then Pg persistence |
| 8 | **No phone, no life-OS** — desk-only command center fails the life vision | approvals + capture happen where life happens | PWA + push approvals + passkey; VOICE brain dump |
| 9 | **IP/entity hygiene for the OS itself** — ownership unassigned across personal/Divini/FounderOS; foundation shared-infra considerations | diligence crisis at sale/investment time | one counsel session; assignment docs (analysis-for-review, house rule) |
| 10 | **No 2 a.m. drill** — ORCH_PAUSED exists; no pause-everything panel, no rehearsed incident runbook | you fall to your preparation | one-page incident runbook + a quarterly 15-minute drill |

Reading order for maximum effect: 3 (adoption) → 5 (first dollar) → 2 (operator security) → 1
(continuity) → 7 (data custody) → the rest.
