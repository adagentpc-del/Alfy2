# Blind Spots — What the Vision Is Missing That Nobody Asked For

Advisory record, 2026-07-02 (status updated same day, after the gap-closing build). The gaps NOT on
the roadmap that would be massive to close — ranked by how badly each would hurt. Companion to
VISION_GAP_AUDIT.md (which tracks the known path).

| # | Blind spot | Why it's massive | Status after the gap-closing build |
|---|---|---|---|
| 1 | **Founder single-point-of-failure** — every gate ends at Alyssa; illness = machine halt | continuity is what makes a structure an institution | **PROTOCOL SHIPPED** — docs/CONTINUITY_PROTOCOL.md (delegation tiers T0–T3 on existing gate machinery, break-glass runbook, custody record). Remaining: name the deputy + attestor, set caps (counsel session) |
| 2 | **The operator is the attack surface** — one bearer token = full authority | strongest gates, weakest front door | **CHECKLIST SHIPPED** — docs/OPERATOR_SECURITY.md (ordered: hardware keys → kill SMS 2FA → token rotation → passkeys next auth build). Remaining: Alyssa's evening with two security keys |
| 3 | **The museum risk (adoption)** — nothing forces real life into the OS | unused systems die beautiful | **IMPORT PATH SHIPPED** — /vault import restores any workspace; brain dump + Life screen are the capture surfaces. Remaining: the human week of "if it's not in Alfy2 it doesn't exist" |
| 4 | **Trust layer for agent output** — review at scale becomes rubber-stamping | governance dies quietly | **SHIPPED** — the approval drawer now has the third verb: Request changes WITH reason; notes accumulate on the request + action log (the training signal). Next: feed notes to agent-eval |
| 5 | **No first-dollar milestone** | proof beats promise | **INSTRUMENTED** — Command Center "First dollar through the machine" card tracks the 4 steps live (connect → pooler DB → Pay link → paid invoice). Remaining: the dollar itself |
| 6 | **The machine has no P&L** | NORTHSTAR demands the OS prove ROI like an employee | **INSTRUMENTED** — Command Center "Machine P&L" card: AI spend (metered, $5/day cap), infra, subscriptions (registry-tracked), revenue attributed. Honest zeros until live |
| 7 | **Mortal data TODAY** — one browser's localStorage | a cleared cache erases work now | **CLOSED** — /vault: export/import everything (credential-free, preview-first, tamper-refusing, `pnpm custody:smoke`); Postgres twin live (`web_module_state` + append-only `vault_snapshots`, RLS, migration 0244). Remaining: the quarterly restore drill habit |
| 8 | **No phone, no life-OS** | approvals + capture happen where life happens | **PWA SHIPPED** — manifest + icon + theme color: installable to a home screen, opens standalone to the Command Center. Remaining: push notifications + voice capture (needs a service-worker slice) |
| 9 | **IP/entity hygiene for the OS itself** | diligence crisis at sale/investment time | **ANALYSIS SHIPPED** — docs/IP_ENTITY_HYGIENE.md (owner target, license-down model, foundation considerations, counsel checklist). Remaining: the one counsel session (house rule: never self-executed) |
| 10 | **No 2 a.m. drill** | you fall to your preparation | **RUNBOOK SHIPPED** — docs/INCIDENT_RUNBOOK.md (first-five-minutes: pause → deny → rotate; per-incident table; drill calendar). Remaining: the first 15-minute drill |

**Scorecard: 1 fully closed in code (#7), 5 shipped as working product (#3, #4, #5, #6, #8), 4
shipped as protocols awaiting one human act each (#1, #2, #9, #10).** Everything left on this list
requires Alyssa's hands or a counsel session — no further build work closes it.

Reading order for maximum effect: 3 (adoption) → 5 (first dollar) → 2 (operator security) → 1
(continuity) → 7 (data custody) → the rest.
