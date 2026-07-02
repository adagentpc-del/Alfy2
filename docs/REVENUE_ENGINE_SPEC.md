# Revenue Engine — Spec

The revenue engine is Alfy2's most-built system: it is **already specified twice and wired live**. This doc
is the umbrella that names the canonical pieces and how they compose; it deliberately re-specifies nothing.

**Canonical specs:** `docs/REVENUE_EXECUTION_LAYER.md` (ADR-0032–0036: Conversion Engine, Follow-Up
Execution, Revenue Command, Sales Asset Generator, Execution Queue) and `docs/REVENUE_CHAIN.md`
(ADR-0040–0044: Knowledge Vault → Revenue Factory → Conversion War Room → Deal Desk → Follow-Up
Autopilot). Runtime: **R6 Revenue OS is live** — `revenue-command`/`revops` engines + migrations
`0228`/`0242`/`0243` + routes `GET /revops/brief`, `GET /revops/fastest-path`, `POST /decisions/evaluate`,
`GET/POST /decisions*`, `POST /capital/allocate`, `POST /capital/runway`, `GET /capital/accounts`.

## Canonical modules (vs the exploratory duplicates)

| Concern | Canonical | Also exists (in-memory takes, kept for reference) |
|---|---|---|
| Command view / next money action | `revenue-command` (+ `revops`) | `revenue`, `revenue-truth` |
| Fastest path to cash per business | `revenue-command` `fastest-path` | `revenue-factory` |
| Deal records | `deal-desk` (migration `0076`) | — |
| Capital allocation | `capital-allocation` (repo + routes) | `capital-allocator`, `capital-board`, `capital-engine` |

New revenue work extends the canonical column only.

## The engine, end to end

```
attention (GTM Factory) → leads → Deal Desk (one record per opportunity)
  → Revenue Command: fastest path to cash · easiest offer · next money action (per business, daily)
  → Execution Queue (priority: revenue > risk > deadlines > follow-up > operations)
  → Follow-Up Autopilot (never drops a thread; external sends gated)
  → Conversion War Room (A/B on revenue per send — never vanity metrics)
  → cash → Capital Allocation (Profit-First, recommend-only) → runway on Mission Control
```

Money invariants (inherited, absolute): `move_money`, `charge`, `send_contract`, `change_pricing` are
always-approve action classes; the Finance Command Center's `forbiddenActions()` stands; capital
allocation is **recommend-only** — no engine executes a transfer, ever.

## Portfolio view

Every business gets the same engine, business-scoped: its own fastest-path-to-cash, deal desk slice,
and weighted pipeline, rolled up to Mission Control tiles and the Portfolio Strategist's monthly re-rank.
The daily question the engine must answer per business is unchanged: **"what do we do today to make
money?"** — computed, ranked, and queued with approvals attached.

## Gaps to close (tracked in `docs/FIVE_DAY_COMPLETION_PLAN.md`)

1. Live data: tables are empty until a real source connects (Move Mi connector first).
2. UI: `/revops` brief + fastest-path have no dashboard tab yet.
3. Stripe/PayPal remain blueprint-only; revenue truth comes from connectors later — mock adapters first.
