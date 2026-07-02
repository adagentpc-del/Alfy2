# Executive Dashboard Components

The decision-grade components every Alfy2 screen composes, and the data each one binds to.
Layout/spec: `EXECUTIVE_DASHBOARD_SPEC.md`. Visual rules: `DESIGN_SYSTEM.md`.

## The executive strip (mandatory on every screen)

`execStrip(cells)` — nine facts, three-second read, rendered as one hairline band under the header:

| Cell | Question it answers | Typical source |
|---|---|---|
| Status | am I okay here? | view-specific rollup |
| Priority | what outranks what? | P1 company / money-first / cadence rule |
| Owner / agent | who carries this? | agent registry title |
| Next action | what moves it forward? | owning agent's `next_action` |
| Blocked | what's stuck? | blocked workflows / gates awaiting decision |
| Approval needed | what waits on Alyssa? | pending approvals count/slice |
| Revenue relevance | why does this matter in dollars? | MTD/target, sponsor, fastest path |
| Last updated | how fresh is this? | latest action-log timestamp |
| **Recommended executive decision** | if she reads one cell, which? | computed; gold-washed, serif, double width |

Empty cells drop silently — never render "—" theater. The decision cell is always last and always present.

## Component → data bindings (today: services.mjs mock; later: same-shape API)

| Component | Binding |
|---|---|
| Metric tiles (command center) | `getExecutiveDashboardSummary()` → revenue, needs-you, companies green, agents on post, blocked |
| Business status card | `getPortfolioCompanies()` rows with dot + priority + MTD |
| Pending approvals card | `getApprovalRequests("pending")` top 3 → `approvalRow` (drawer-enabled) |
| Blocked workflows card | summary `blocked_workflows` |
| Agent recommendations | blocked agents' next actions + CRO/Strategy next actions |
| Weekly summary card | `getOperatingReports()` latest headline + revenue line |
| Live tiles / live queue | `getLiveMissionControl()` / `getLiveApprovals()` — skeleton → live → graceful failure banner |
| Gates strip (studio) | `gateStatus()` per episode approval id |
| Brain preview | `getBrainGraph()` → `mountBrain` |

## Decision surfaces

Three, in strength order: **drawer** (full context + Approve/Deny — the canonical decision surface),
**inline Approve/Deny** on approval rows (fast path), **NBA banner** (routes to the queue). All three end
in the same service call and the same action-log entry; a decision is never more than two clicks from
any screen.
