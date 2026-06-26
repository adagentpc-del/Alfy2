# Leverage & Media — the capstone of compounding and command

Alfy² now has a leverage-and-media capstone: the engines that turn every moment into media, every solution into
many uses, and every decision into a judged, reviewable choice. The defining rule runs through all of them in one
line: **maximize leverage and Alyssa's freedom — nothing is created once if it can compound, analyze
aggressively, but keep the human in command.** The media engines mine every experience into stories and multiply
every moment into finished, brand-correct assets — and nothing publishes without Alyssa, because the gate is the
point. The leverage engines refuse to let work be done once: they score compounding, multiplication, and leverage,
and prefer the path that compounds over the path that finishes fastest. The executive-judgment engines give a solo
founder a board, a journal, an allocator, and a timeline — aggressive analysis, with the human deciding. Above all
of them sit the Five Immutable Laws, the frozen bedrock every feature answers to. All deterministic, tenant-scoped.

| Engine | Module | Contracts | Migrations | ADR | Smoke |
| --- | --- | --- | --- | --- | --- |
| Story Mining Engine | `core/src/story-mining/engine.ts` | `story-mining.ts` | 0132/0133 | ADR-0074 | `pnpm story:smoke` |
| Media Operating System | `core/src/media-os/engine.ts` | `media-os.ts` | 0134/0135 | ADR-0075 | `pnpm mediaos:smoke` |
| Brand DNA Engine | `core/src/brand-dna/engine.ts` | `brand-dna.ts` | 0136/0137 | ADR-0076 | `pnpm brand:smoke` |
| Content Factory | `core/src/content-factory/factory.ts` | `content-factory.ts` | 0138/0139 | ADR-0077 | `pnpm contentfactory:smoke` |
| Production Studio | `core/src/production-studio/studio.ts` | `production-studio.ts` | 0140/0141 + 0142/0143 | ADR-0078 | `pnpm prodstudio:smoke` |
| Visibility Engine | `core/src/visibility/engine.ts` | `visibility.ts` | 0144/0145 | ADR-0079 | `pnpm visibility:smoke` |
| PR & Authority Engine | `core/src/pr-authority/engine.ts` | `pr-authority.ts` | 0146/0147 | ADR-0080 | `pnpm prauthority:smoke` |
| Audience Intelligence | `core/src/audience-intel/engine.ts` | `audience-intel.ts` | 0148/0149 | ADR-0081 | `pnpm audience:smoke` |
| Personal Freedom Engine | `core/src/personal-freedom/engine.ts` | `personal-freedom.ts` | 0150/0151 | ADR-0082 | `pnpm freedom:smoke` |
| Legacy Engine | `core/src/legacy/engine.ts` | `legacy.ts` | 0152/0153 | ADR-0083 | `pnpm legacy:smoke` |
| Compounding Engine | `core/src/compounding/engine.ts` | `compounding.ts` | 0154/0155 + 0156/0157 | ADR-0084 | `pnpm compounding:smoke` |
| Multiplication Engine | `core/src/multiplication/engine.ts` | `multiplication.ts` | 0158/0159 | ADR-0085 | `pnpm multiplication:smoke` |
| Leverage Engine | `core/src/leverage/engine.ts` | `leverage.ts` | 0160/0161 | ADR-0086 | `pnpm leverage:smoke` |
| The Five Immutable Laws | `core/src/immutable-laws/laws.ts` | `immutable-laws.ts` | none (catalog) | ADR-0087 | `pnpm laws:smoke` |
| Executive Capital Allocator | `core/src/capital-allocator/allocator.ts` | `capital-allocator.ts` | 0162/0163 | ADR-0088 | `pnpm capital:smoke` |
| Opportunity Cost Engine | `core/src/opportunity-cost/engine.ts` | `opportunity-cost.ts` | 0164/0165 | ADR-0089 | `pnpm oppcost:smoke` |
| Executive Decision Journal | `core/src/decision-journal/journal.ts` | `decision-journal.ts` | 0166/0167 | ADR-0090 | `pnpm journal:smoke` |
| Enterprise Memory Timeline | `core/src/memory-timeline/timeline.ts` | `memory-timeline.ts` | 0168/0169 | ADR-0091 | `pnpm timeline:smoke` |
| Executive Review Board | `core/src/review-board/board.ts` | `review-board.ts` | 0170/0171 | ADR-0092 | `pnpm board:smoke` |

## Media & Content — every moment into many assets, nothing published without Alyssa

The media engines mine, multiply, and finish — and stop at the approval line. Production is aggressive; publishing
is not.

### Story Mining Engine — never lose a good story

Turns every experience from **twelve sources** into a fully worked story for **eight channels**, each carrying its
hook, conflict, lesson, emotion, transformation, why-it-matters, audience, business-tie-in, CTA, proof,
best-channels, and urgency. Merging the prior Story Mining and Story Intelligence ideas, it refuses to let a good
story evaporate: every mined story is retained append-only, so a moment that mattered is still tellable a month
later. It feeds the rest of the media stack the raw narrative they no longer have to invent.

### Media Operating System — one moment, many assets, gated

Takes one raw moment in **eleven input kinds** and produces many finished, brand-correct assets across **twelve
output kinds** — the afternoon of manual production collapsed into one pass. **`requires_approval` is always true**
on every asset: nothing leaves for a channel without Alyssa's sign-off. The engine removes the labor without
removing command — it gives Alyssa her life back, not her hands off the wheel — and resolves brand via Brand DNA
before producing a single asset.

### Brand DNA Engine — which brand, and what it is

Seeds **nine brands**, each with a full identity (voice, visuals, audience, values, promise), as the source of
truth the media stack reads from. **`resolveBrand()`** auto-detects which brand a moment belongs to, so the Media
OS produces every asset under the right identity without the founder tagging each moment by hand.

### Content Factory — one source, a 42-piece package, nothing made twice

From one source it produces a **42-piece linked package** via **`CONTENT_MULTIPLIER`** (1 YouTube long, 5 shorts,
5 reels, 10 X, 5 LinkedIn, 3 carousels, …) — a declared recipe, so a source reliably yields the same complete
package every time. The pieces are linked back to their source and siblings and tracked as one unit; the
discipline is that nothing is created twice, and packages are append-only. Brand-correctness comes from Brand DNA.

### Production Studio — approval triggers finished media

Stores **seventeen production-asset kinds** as a reusable library and **per-brand presets** that run the
post-approval pipeline automatically — for Decoded: Intro A, Outro B, a sponsor read after the first topic,
chapters, subtitles, clips, show notes, and a schedule. The presets sit downstream of the approval gate, so Alyssa
approves a piece and receives finished media rather than a production checklist.

### Visibility Engine — measure it, name the weak signals

Computes a per-business **Visibility Score** from **fourteen signals** and recommends where/what/when to post,
collaborators, podcasts to appear on, conferences, and awards — and names the **three weakest signals** outright,
so the gap is explicit rather than buried. Scores are append-only, preserving the visibility trajectory; outreach
that flows from the recommendations is approval-gated.

### PR & Authority Engine — catch the moment, never send unapproved

Auto-detects PR opportunities from **six triggers** (launch / partnership / funding / win / trend / innovation) →
a drafted pitch plus target outlets, ready the moment the window opens, plus the authority asset stack. **`markSent`
throws unless approved** — a pitch under Alyssa's name never leaves on the engine's judgment alone. It complements
the per-business PR Strategy Generator (ADR-0073): strategy there, moment-catching here.

### Audience Intelligence — distill the audience, merge as it speaks

Distills an audience's **fears, goals, language, objections, desires, misconceptions, favorite content, and best
offers** from **nine signal kinds**, the material every downstream message needs to resonate. Re-analysis
**upserts** — new signal is merged into the existing portrait rather than resetting it — so understanding
accumulates over months instead of being re-derived from scratch.

## Leverage & Compounding — never solve once

The leverage engines refuse to let work be done once, and prefer the path that compounds to the path that finishes
fastest.

### Personal Freedom Engine — more freedom without losing performance

Tracks **work vs life hours**, computes a **freedom score**, and recommends automation, delegation,
agent-creation, workflow-improvement, and batching — every recommendation carrying **`preserves_performance:
true`**. It only proposes freedom that does not cost output: maximize life, not minimize effort. Append-only, so
the freedom trajectory is preserved.

### Legacy Engine — knowledge that compounds for decades

Turns repeatable knowledge in **ten kinds** into **enduring legacy forms** — SOP, FounderOS feature, course,
podcast, keynote, book chapter, licensing, consulting framework — each with a **legacy score** that ranks the
conversions by durable, compounding value. Tacit know-how becomes IP that outlives the moment; append-only, so the
IP record only grows.

### Compounding Engine — optimize for compounding, not output

Evaluates every completed task for **twenty-one reusable forms**, scores it on **eight compounding dimensions**,
recommends creating the reusable version, and maintains the **Asset Lineage Graph** (what created it / what it
created / businesses / revenue / agents / workflows / version). Evaluations are append-only; the lineage graph is
mutable and grows as an asset creates more — so compounding becomes visible, not assumed.

### Multiplication Engine — 1 solution → 100 uses → 1000 hours saved

Never solve once: evaluates whether a solution helps **nine targets**, recommends **eight shared forms**, and
scores **Multiplication** as future uses per 100. The score surfaces the solutions where one build yields the most
downstream uses, so a fix is spent once and harvested many times. Append-only.

### Leverage Engine — the highest-leverage path, not the fastest

Scores every recommendation on **fourteen inputs** into a **tier** — low, medium, high, compounding, generational
— and **`compare()`** recommends the highest-leverage path even when it is not the fastest, thinking like an owner
allocating capital and time. The `score()` that produces a tier is **pure**; **`compare()` persists** its
comparisons append-only, keeping the record of leverage decisions.

## Executive Judgment — analyze aggressively, the human commands

The executive-judgment engines give a solo founder a board, an allocator, a journal, and a timeline — and the
frozen laws every feature answers to.

### The Five Immutable Laws — the frozen bedrock

**Protect the Human, Compound Everything, Allocate Capital Intelligently, Prefer Systems Over Heroics, Increase
Founder Freedom** — five frozen laws every feature, agent, workflow, and recommendation must satisfy. **Law 1 and
Law 4 are hard gates** — a proposal that endangers the human or relies on heroics is blocked, not flagged — and
every major recommendation explains how it satisfies the laws. There is **none (catalog)** — a frozen catalog plus
a pure checker, no migration.

### Executive Capital Allocator — never deplete one resource for another

On daily, weekly, and quarterly horizons, computes the highest-value allocation across **twelve capital kinds**
(time / money / energy / attention / relationships / reputation / knowledge / technology / assets / employees /
agents / automation), surfacing the highest ROI / leverage / compounding / strategic / freedom moves. Every pick
names its **trade-off** — what it depletes — and the quarterly horizon names **what to stop**, so allocation never
optimizes one resource while destroying another. Append-only.

### Opportunity Cost Engine — always show what is not chosen

Compares **two to four options** on nine dimensions (upside / downside / capital / time / stress / complexity /
risk / confidence / leverage), computes each option's **opportunity cost** versus the best alternative, and names
the best financial / strategic / long-term / low-risk / fastest / highest-leverage choice — always showing **what
is not chosen and why**, so the road not taken is visible. Append-only.

### Executive Decision Journal — close the loop on every decision

Records decisions with their alternatives, reasoning, data, assumptions, risks, and expected outcome; **schedules
30/90/365-day reviews** to record the actual outcome and lessons; and surfaces **recurring decision patterns**
(categories with two or more decisions) to improve future recommendations. It is how the platform stops making the
same misjudgment twice.

### Enterprise Memory Timeline — origins and consequences, retrievable

A chronological history of **thirteen event kinds**, each linking related assets, agents, people, businesses, and
lessons. **`firstMention`** answers "when did we first discuss this?" and **`after`** answers "what happened after
that decision?" — turning the timeline from a log into something the founder can interrogate. Append-only; the
history is extended, never rewritten.

### Executive Review Board — a board for a solo founder

A virtual board of **ten roles** (CEO / CFO / COO / CTO / CMO / CLO / CRO / CSO / CPO / CCO), each independently
evaluating benefits, risks, blind spots, dependencies, costs, and operational impact through its lens. The
synthesis **highlights disagreements** rather than forcing consensus — surfacing the tension the founder most needs
to see — and advises, never commands. Append-only.

## How they connect

The capstone is one loop from moment to leverage to judgment, and the human is at the centre of all three. The
**Story Mining Engine** turns every experience into stories the **Media Operating System** and **Content Factory**
multiply into finished, brand-correct assets — **Brand DNA** resolving which brand each belongs to, the
**Production Studio** finishing them on approval, the **Visibility**, **PR & Authority**, and **Audience
Intelligence** engines pointing them where they earn attention — and nothing publishes without Alyssa, because the
approval gate is the point. Everything those engines produce is then put through the leverage layer: the
**Compounding** and **Multiplication** engines refuse to let any solution be done once, the **Legacy Engine**
turns repeatable knowledge into IP that compounds for decades, the **Personal Freedom Engine** buys back Alyssa's
time without losing performance, and the **Leverage Engine** prefers the path that compounds to the path that
finishes fastest. The executive-judgment layer governs the decisions: the **Capital Allocator** spends every form
of capital to its highest use without depleting another, the **Opportunity Cost Engine** shows what is not chosen,
the **Decision Journal** closes the loop on outcomes, the **Memory Timeline** answers when it started and what
followed, and the **Review Board** convenes ten lenses on every major call. Above all of them sit the **Five
Immutable Laws** — the frozen bedrock that protects the human, compounds everything, allocates capital
intelligently, prefers systems over heroics, and increases founder freedom. Moments become media, media compounds
into leverage, leverage is allocated by judgment — and the human stays in command of every gate.
