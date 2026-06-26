# Execution Safety Nets

Three engines that keep execution honest: the **Don't Drop the Ball System** catches what falls through
the cracks, the **Business Asset Checklist** tracks what each business is missing, and **Money-First
Operating Mode** biases the whole system toward cash on demand. All deterministic and tenant-scoped.

| Engine | Module | Contracts | Migrations | ADR | Smoke |
| --- | --- | --- | --- | --- | --- |
| Don't Drop the Ball | `core/src/dont-drop-ball/` | `dont-drop-ball.ts` | 0064/0065 | ADR-0037 | `pnpm ball:smoke` |
| Business Asset Checklist | `core/src/asset-checklist/` | `asset-checklist.ts` | 0066/0067 | ADR-0038 | `pnpm checklist:smoke` |
| Money-First Operating Mode | `core/src/money-first/` | `money-first.ts` | 0068/0069 | ADR-0039 | `pnpm moneyfirst:smoke` |

## Don't Drop the Ball System

Detects the nine kinds of dropped item — **forgotten leads, missed follow-ups, unfinished launches,
abandoned ideas, stale campaigns, unpaid invoices, unsigned contracts, open loops, waiting-on
responses** — by flagging anything past a per-kind staleness threshold (missed follow-up 3 days,
forgotten lead 7, unpaid invoice 30, …). `surfaceDaily()` lists the open items ranked by value then age,
each with a recommended action; `assign(id, agent)` (the approved action) puts an agent on closing the
loop. Re-scanning dedupes by signature.

## Business Asset Checklist

Tracks the **25** key assets per business (logo, domain, email, landing page, social pages, decks,
one-pager, pricing, offer, CRM, templates, scripts, onboarding packet, contracts, NDA, terms, privacy
policy, SOPs, analytics, payment links, lead list, follow-up sequence, content calendar). `build(present)`
shows present/missing and a completeness fraction, and **recommends the fastest, highest-leverage missing
asset next** by walking a priority order (offer → pricing → lead list → follow-up sequence → … →
investor deck). `markPresent` advances the recommendation; `showMissing` lists gaps across businesses.

## Money-First Operating Mode

A switch that, when active, **prioritizes** cash collection, sales, follow-up, booked calls, proposals,
invoices, high-conversion content, warm relationships, and low-friction offers — and **deprioritizes**
perfection, branding polish, unnecessary features, low-conversion ideas, and research without action.
`classify(item)` returns prioritize / deprioritize / neutral with a reason; `prioritize(items)` reorders
a work list money-first while active, and passes it through unchanged when off.

## How they connect

The dropped-ball surface and the asset gaps both become Execution Queue items; the Asset Checklist's
recommendation drives the Sales Asset Generator; and Money-First Mode reshapes the Execution Queue's
ranking and the Control Tower's top priorities. Phase 2 wires all three to live data and schedules.
