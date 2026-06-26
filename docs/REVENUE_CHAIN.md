# The Revenue Chain — asset → campaign → conversation → conversion → cash

Alfy²'s mission: knowledge is not valuable until converted into money. This layer is the chain that does
it — the **Knowledge Vault** turns drops into assets and actions, the **Revenue Factory** points each
business at today's money move, the **Conversion War Room** optimizes the conversation→conversion copy on
revenue, **Follow-Up Autopilot** never lets a thread die, and the **Deal Desk** carries every opportunity
to cash. All deterministic, tenant-scoped, human-gated.

| Engine | Module | Contracts | Migrations | ADR | Smoke |
| --- | --- | --- | --- | --- | --- |
| Knowledge Vault | `core/src/knowledge-vault/` | `knowledge-vault.ts` | 0070/0071 | ADR-0040 | `pnpm vault:smoke` |
| Revenue Factory | `core/src/revenue-factory/` | `revenue-factory.ts` | 0072/0073 | ADR-0041 | `pnpm revfactory:smoke` |
| Conversion War Room | `core/src/war-room/` | `war-room.ts` | 0074/0075 | ADR-0042 | `pnpm warroom:smoke` |
| Deal Desk | `core/src/deal-desk/` | `deal-desk.ts` | 0076/0077 | ADR-0043 | `pnpm dealdesk:smoke` |
| Follow-Up Autopilot | `core/src/follow-up/` (extended) | `follow-up.ts` | 0078 (alter) | ADR-0044 | `pnpm autopilot:smoke` |

## Knowledge Vault — knowledge → asset + actions

Thirteen input kinds (adds voice notes, meeting notes, random ideas to the earlier ingestion set).
Every drop is extracted into **eleven fields** — key ideas, frameworks, tactics, quotes, examples,
business applications, monetization opportunities, related businesses, related agents, related assets,
and **action items** — saved to the Asset Library by reference, and converted into executable actions.
It never just stores.

## Revenue Factory — "what do we do today to make money?"

Per business, from offers/pricing/leads/proposals/follow-ups it computes the fastest path to cash, the
easiest offer to sell, the offer most likely to convert, the best warm contact, the lowest-effort revenue
action, and the highest-value follow-up — then names the single headline money move for today.

## Conversion War Room — conversation → conversion, on revenue

A/B tests across nine surfaces tracking the full funnel (open/reply/click/booked-call/close rates,
time-to-conversion, revenue, negative replies, objections). The winner is decided on **revenue per send,
then booked calls, then qualified leads** — never opens or clicks — and only once each variant has enough
sends.

## Follow-Up Autopilot — never lose money to dropped follow-up

The Follow-Up Execution Engine, extended: an approved sequence keeps going until a response arrives, a
**meeting is booked**, a **deal closes**, the goal is reached, the sequence completes, a risk appears, or
Alyssa pauses it — and it **escalates only when human judgment is needed**, with the reason, to its own
escalation queue.

## Deal Desk — conversion → cash

One full-context record per opportunity, ranked by probability, revenue, speed, strategic value, or
effort, always surfacing the next money move, the blocked deals, and the deals likely to die without
action.

## How the chain links

A Vault drop becomes an asset and action items → the Revenue Factory and Sales Asset Generator turn those
into offers and campaigns → the War Room optimizes the copy on revenue → Follow-Up Autopilot runs the
conversations → the Deal Desk carries the opportunity to cash, escalating to Alyssa only when she's truly
needed. Phase 2 wires all five to live data and schedules.
