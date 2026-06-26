# Revenue & Execution Layer

Five engines that turn the platform's intelligence into money and motion: the **Conversion Engine**
improves what converts, the **Follow-Up Execution Engine** makes sure nothing goes cold, the **Revenue
Command System** answers "where's the money," the **Sales Asset Generator** ships the sales kit, and the
**Execution Queue** says what to do next. All deterministic and tenant-scoped.

| Engine | Module | Contracts | Migrations | ADR | Smoke |
| --- | --- | --- | --- | --- | --- |
| Conversion Engine | `core/src/conversion/` | `conversion.ts` | 0054/0055 | ADR-0032 | `pnpm conversion:smoke` |
| Follow-Up Execution | `core/src/follow-up/` | `follow-up.ts` | 0056/0057 | ADR-0033 | `pnpm followup:smoke` |
| Revenue Command System | `core/src/revenue/` | `revenue.ts` | 0058/0059 | ADR-0034 | `pnpm revenue:smoke` |
| Sales Asset Generator | `core/src/sales-asset/` | `sales-asset.ts` | 0060/0061 | ADR-0035 | `pnpm salesasset:smoke` |
| Execution Queue | `core/src/execution-queue/` | `execution-queue.ts` | 0062/0063 | ADR-0036 | `pnpm queue:smoke` |

## Conversion Engine

Tracks and improves the eleven conversion surfaces (landing pages, offers, hooks, CTAs, emails, DMs,
sales calls, decks, proposals, follow-ups, checkout flows). Per business it keeps a baseline, active
tests, winning and losing copy, objections, best offers, and the next optimization. **A/B winners are
decided by revenue per unit, not vanity conversion** — a lower-converting, higher-value variant wins.
Offers are ranked by revenue.

## Follow-Up Execution Engine

Tracks the nine entity kinds (leads, warm contacts, deals, vendors, investors, clients, partners,
unanswered emails, stale opportunities). Builds a sequence (default 24h/3d/7d/14d/30d), gates on
approval, then **keeps going until** a response arrives, the goal is reached, the sequence completes, a
risk appears, or Alyssa pauses it — with an approval queue, a reminders worklist, and reactivation.

## Revenue Command System

From a business's revenue snapshot it always knows the **fastest path to cash** (highest expected value
per day), the **easiest offer to sell**, the **best lead source**, the **highest-ROI campaign**, the
**stuck deals**, and the **next money action** — plus the weighted pipeline vs the revenue goal.

## Sales Asset Generator

For any business, generates all **twelve** sales assets (one-pager, pitch/investor/sales deck, proposal,
email sequence, DM/call script, objection handling, FAQ, case study template, onboarding packet), shaped
to the offer and audience, and **saves each to the Global Asset Library**.

## Execution Queue

Separates work into eight buckets (ideas, tasks, approved actions, blocked actions, waiting on Alyssa,
automated workflows, money actions, risk actions) and ranks by the fixed priority order **revenue → risk
→ deadlines → follow-up → operations → personal admin → nice-to-have** (then sooner deadlines, then
value). `next()` returns the single highest-priority **actionable** item — skipping blocked and
waiting-on-Alyssa items — so the system always knows what to do next.

## How they connect

The Revenue Command System reads the Conversion Engine's offers and the Follow-Up Engine's open count;
its next money action, the Follow-Up Engine's due touches, and Enterprise Security's approvals all flow
into the Execution Queue, which feeds the Executive Control Tower and Executive Inbox. The Sales Asset
Generator files into the Global Asset Library. Phase 2 wires these to live data and runs the loops on a
schedule.
