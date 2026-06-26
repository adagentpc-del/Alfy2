# Finance, Intelligence & Media — the executive operating suite

Alfy² now has a finance, intelligence, and media suite: the engines that manage Alyssa's money, turn the outside
world into executive intelligence, score everything the platform tracks, and run the podcast and PR operation.
The defining rule of the money engines is one line: **Alfy² analyzes aggressively but executes conservatively.**
It reasons about finances, taxes, entity structures, and wealth strategies as boldly as it can — and it never
moves money, files taxes, opens an account, creates an entity, or signs anything without Alyssa's approval and
professional (CPA / attorney) review. Tax work here is **legal optimization** — avoidance, deferral, deduction,
structuring, planning — **never evasion**, and it is analysis-for-review, never advice. On the intelligence side
the **Executive Intelligence Network** converts information into decisions and never rereads a story twice; the
**scoring overlay** ranks the platform's objects transparently; and the **briefing**, **podcast**, and **PR**
engines run the executive's rhythm and public presence. All deterministic, tenant-scoped.

| Engine | Module | Contracts | Migrations | ADR | Smoke |
| --- | --- | --- | --- | --- | --- |
| Finance Command Center | `core/src/finance-command/center.ts` | `finance-command.ts` | 0105/0106 | ADR-0061 | `pnpm finance:smoke` |
| Legal Tax Strategy Analyzer | `core/src/tax-strategy/analyzer.ts` | `tax-strategy.ts` | 0107/0108 | ADR-0062 | `pnpm tax:smoke` |
| Entity Structure Optimizer | `core/src/entity-structure/optimizer.ts` | `entity-structure.ts` | 0109/0110 | ADR-0063 | `pnpm entity:smoke` |
| Wealth Architecture Dump Box | `core/src/wealth-dump-box/box.ts` | `wealth-dump-box.ts` | 0111/0112 | ADR-0064 | `pnpm wealthbox:smoke` |
| Elite Money Game Engine | `core/src/money-game/engine.ts` | `money-game.ts` | 0113/0114 | ADR-0065 | `pnpm moneygame:smoke` |
| Algorithm Overlay System | `core/src/algorithm-overlay/overlay.ts` | `algorithm-overlay.ts` | none (static) | ADR-0066 | `pnpm overlay:smoke` |
| Executive Intelligence Network | `core/src/intelligence-network/ein.ts` | `intelligence-network.ts` | 0115/0116 + 0117/0118 | ADR-0067 | `pnpm ein:smoke` |
| Failure Database + Future Trends Lab | `core/src/failure-database/database.ts` + `core/src/future-trends/lab.ts` | `failure-trends.ts` | 0119/0120 + 0121/0122 | ADR-0068 | `pnpm failuredb:smoke` + `pnpm trends:smoke` |
| Intelligence Lenses | `core/src/intel-lenses/why-this-matters.ts` + `core/src/intel-lenses/contrarian.ts` | `intel-lenses.ts` | none (read model) | ADR-0069 | `pnpm whymatters:smoke` + `pnpm contrarian:smoke` |
| Briefing Engine | `core/src/briefings/engine.ts` | `briefings.ts` | 0123/0124 | ADR-0070 | `pnpm briefing:smoke` |
| Podcast Studio OS | `core/src/podcast-studio/studio.ts` | `podcast-studio.ts` | 0125/0126 | ADR-0071 | `pnpm podcast:smoke` |
| Podcast Guest Booking Agent | `core/src/podcast-guests/agent.ts` | `podcast-guests.ts` | 0127/0128 | ADR-0072 | `pnpm guestbooking:smoke` |
| PR Department | `core/src/pr/generator.ts` | `pr.ts` | 0129/0130 + 0131 | ADR-0073 | `pnpm business:smoke` |

## Finance & Wealth — analyze aggressively, execute conservatively

The four finance engines and the money-game catalog share one discipline: reason about money boldly, touch it
never without approval and professional review.

### Finance Command Center — the whole money picture

The complete personal and business financial view. For **each business** it reports monthly revenue and
expenses, profit, margin, tax exposure, cash runway, the best next financial action, risks, and opportunities;
above them it rolls up the totals and sets them beside personal net worth. The hard guardrail is mechanical:
**`money_actions_require_approval` is always true** and **`forbiddenActions()`** exposes the never-without-
approval list — **move_money, spend_money, open_account, execute_investment, file_taxes, sign_document.**
Snapshots are append-only.

### Legal Tax Strategy Analyzer — optimization, not advice

Analyzes **fifteen tax areas**; every recommendation carries `why_it_may_apply`, `estimated_benefit`,
`risk_level`, `complexity`, `requires_professional_review` (**always true**), `documents_needed`, `next_step`,
and `questions_for_advisor`, under a standing disclaimer. It is **legal optimization only** — avoidance,
deferral, deduction, structuring, planning — never evasion, and CPA/attorney review is required. Analysis for a
professional, never tax advice, never a filing.

### Entity Structure Optimizer — recommend, never form

LLC vs S Corp vs C Corp vs subsidiary vs holding company by a transparent rule: **raise/exit → C Corp; IP / SaaS
/ liability → holding company; profit ≥ 60k + payroll → LLC taxed as S Corp; else LLC.** Each recommendation
ships with the alternatives (pros, cons, tax, legal), CPA and attorney questions, and an action checklist;
`requires_professional_review` is **always true**. It never forms, converts, files, or signs.

### Wealth Architecture Dump Box — the finance drop

A finance-specific drop that runs every item through a **ten-step pipeline**: classify, summarize, scope
personal/business, legality notes, upside, risk, link to goals, advisor questions, save to the Wealth Knowledge
Vault **by reference**, and next action. Any **tax, trust, IRA, offshore, or financial-product** item is flagged
for professional review and routed to a CPA or attorney rather than executed.

### Elite Money Game Engine — the downside-first playbook

A **seventeen-strategy** catalog (holding / operating / IP companies, management fees, owner comp, retirement,
SDIRA, Solo 401(k), trusts, real estate, investments, deductions, charitable, insurance, asset protection,
estate, compliant offshore), each with what / when / when-not / benefits / risks / compliance / advisor /
complexity / steps. `analyze()` assembles a ranked plan with **`protect_downside_first`** and
**`legal_avoidance_only`** always true. Legal avoidance only; the named advisor executes, never the engine.

## Scoring Overlay — one transparent ranking layer

### Algorithm Overlay System — fifteen algorithms over everything

**Fifteen transparent scoring algorithms** — priority, ROI, fastest path to cash, friction, conversion
probability, agent-need detection, opportunity matching, business health, goal gap, risk, pattern prediction,
energy-aware scheduling, knowledge-to-money, portfolio allocation, A/B-test winner — sitting above agents,
workflows, goals, businesses, campaigns, and tasks. **Phase 1 is rules-based**, and the design graduates each
algorithm through phases (rules → weighted → historical → predictive). Each score is `0..1` with confidence,
why, `data_used`, `data_missing`, a recommended action, a `requires_approval` flag, and an override. There is
**no migration** — a static catalog plus computed scores.

## Intelligence Network & Briefings — information into decisions

### Executive Intelligence Network — intelligence, not summaries

Converts external information into executive intelligence. **Ten article scores** drive a five-way
**classification** — ignore / interesting / monitor / research / immediate_action; each item states why it
matters, the businesses and goals affected, agents to notify, immediate actions, future implications,
confidence, sources, and follow-ups. Developing stories roll into **one living briefing** with a timeline, so
the same story is **never reread twice.** Items are append-only (0115/0116); living briefings are mutable
(0117/0118).

### Failure Database + Future Trends Lab — remember the past, prepare for the future

The **Failure Database** tracks **nine failure kinds** as permanent institutional knowledge (what happened,
timeline, why, root cause, warning signs, lessons, how Alfy² avoids repeating it), append-only. The **Future
Trends Lab** tracks trends over **six months to ten years** with likelihood, impact, affected
industries/businesses, preparation steps, skills/tech needed, investments, threats, and a **readiness score
(likelihood × impact)** that ranks them — preparing Alyssa before everyone else. Trends are mutable.

### Intelligence Lenses — relevant and stress-tested

**Why This Matters** translates any item into decisions for Alyssa's businesses (affected, what needs to change,
competitive advantage, compliance risk, product opportunity, test/ignore, assets/agents/workflows to update,
strategy-review tier). **Contrarian View** deliberately constructs the strongest credible opposing case
(mainstream vs contrarian, evidence both sides, ignored risks, questionable assumptions, barriers, compliance,
business-model weaknesses, execution risks, recommendation) to cut blind spots and prevent hype-driven
decisions. Both are **read models with no migration.**

### Briefing Engine — the executive's rhythm

One engine, four briefings: **morning** (priorities, revenue, follow-ups, blocked, calendar, news lanes, agent
recs, ~5 min), **lunch** (a learning/intelligence update — top reads, why, action), **evening** (close the
day — wins, money, what didn't move, plus seven questions, saving reflections to Institutional Memory), and
**weekly** (a strategic intelligence report). Each has a greeting per kind, sections from labeled inputs, and an
estimated reading time. Briefings are append-only.

## Podcast & PR — the public operation

### Podcast Studio OS — idea → episode → monetization

Manages "Decoded with Alyssa DelTorre." Each episode idea is worked up in full — title, hook, premise, why now,
audience, key story, talking points, guest fit, business tie-in, monetization angle, clips, CTA, related
businesses, assets needed — and moves through a **six-stage lifecycle.** Its inputs come from the Executive
Intelligence Network, business updates, and the failure/trends databases, so the show is sourced from what the
platform already knows.

### Podcast Guest Booking Agent — book in both directions, contact on approval

Mines contacts and external experts, ranks them by a weighted composite of **relevance, credibility, audience
fit, and business value**, drafts outreach, tracks replies, and schedules — in both directions
(**inbound_guest** vs **outbound_appearance**, booking Alyssa onto other shows too). It **never contacts anyone
until outreach is approved** (or a persistent approval covers it): **`markContacted` throws** otherwise.

### PR Department — the thirteenth standard department

PR is now standard for **every** business: the Business Template's `template.ts` adds it, `DepartmentKind` gains
**`pr`**, and the template now defines **thirteen departments**. The PR generator produces media angles, target
publications, podcast targets, a founder-story angle, credibility proof, a press-kit checklist, outreach
templates, and reputation risks. Migrations `0129`/`0130` add `pr_strategies` and `0131` widens the
`business_departments` CHECK to allow `'pr'`; coverage rides on `pnpm business:smoke` (now thirteen departments).

## How they connect

The suite is one loop from information to money to public presence. The **Finance Command Center** holds the
money picture, and the **Tax Strategy Analyzer**, **Entity Structure Optimizer**, **Wealth Dump Box**, and
**Elite Money Game Engine** analyze against it — all under the same rule: analyze aggressively, execute
conservatively, with CPA/attorney review on anything that touches money, taxes, entities, or signatures, and
tax work kept to legal optimization, never evasion. The **Algorithm Overlay** scores everything the platform
tracks — including those finance outputs — through one transparent ranking layer. The **Executive Intelligence
Network** turns the outside world into decisions and never rereads a story twice; the **Failure Database** and
**Future Trends Lab** give it memory of the past and a read on the future; and the **Intelligence Lenses** make
each item both relevant to Alyssa's businesses and tested against its strongest critic. The **Briefing Engine**
delivers all of it on the executive's rhythm and writes the evening's reflections into Institutional Memory.
Finally the **Podcast Studio**, **Guest Booking Agent**, and **PR Department** turn that intelligence into a
public operation — episodes sourced from what the platform knows, guests booked only after approval, and a PR
strategy inherited by every business. Information becomes intelligence, intelligence becomes decisions and
episodes, decisions become money — and money never moves without the human.
