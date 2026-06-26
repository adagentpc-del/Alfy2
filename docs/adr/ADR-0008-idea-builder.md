# ADR-0008 — Idea Builder

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
The operator generates a lot of ideas and wants each one worked up the same thorough way before any
effort goes into building. The trigger is a phrase — "I have an idea." — and the output is a complete,
structured evaluation across fifteen dimensions (market research, competitors, pricing, offer,
positioning, MVP, database, API needs, required agents, marketing, SEO, launch, monetization, risks,
recommendation). The hard rule: **never begin building until approval.**

## Decision
1. **One structured blueprint contract.** `IdeaBlueprint` (in `packages/shared`) carries all fifteen
   sections as typed sub-schemas plus a recommendation, an `approved` flag, and a `status`. It is the
   single artifact the builder returns.
2. **Deterministic generation, honestly framed.** The fifteen sections are produced by deterministic
   generators from the idea text and a few shape heuristics (marketplace? app? SaaS? sensitive
   domain?). Research-flavored sections (market, competitors, TAM) are framed as **hypotheses + open
   questions**, not fetched facts — no live web, no fabricated numbers. A research agent behind the AI
   Gateway can deepen them later without changing the contract.
3. **Built on the existing engines.** The idea is classified and scored by the Decision Engine (which
   sets category, priority, and feeds the recommendation), and captured by the Memory Engine as a
   `idea` memory (recording the idea is not building it).
4. **A hard approval gate.** `build()` always returns `status: "awaiting_approval"`, `approved:
   false`, and a recommendation whose `next_step` asks for approval. The bridge to building,
   `handoff()`, **throws `IdeaApprovalError` unless `approved` is true** — and even then it only
   returns the *plan* of what would be built (agents to create, MVP tasks); it constructs nothing.
5. **The trigger is explicit.** `IDEA_BUILDER_TRIGGER = "I have an idea."` so the phrase that launches
   the builder lives in code, not just docs.

## Consequences
- **Positive:** every idea gets the same complete, comparable workup instantly and for free; the
  no-build-until-approval rule is enforced by construction (the gate, the status, the throwing
  handoff); ideas are remembered and comparable over time.
- **Cost:** the research/competitor/pricing sections are structured scaffolds and hypotheses, not
  market truth — they tell the operator *what to validate*, not *the answer*. Section heuristics need
  occasional tuning.
- **Mitigation:** the deterministic path is the cheap default and the honest floor; an AI/research
  classifier can fill the hypotheses with real evidence behind the gated AI Gateway without touching
  the `IdeaBlueprint` contract or the approval gate.

## Alternatives considered
- **AI-generated workup up front:** richer prose, but adds cost/latency and invents market facts that
  read as truth. Deferred behind the AI Gateway; the deterministic scaffold stays the floor.
- **Auto-proceed to building on a strong verdict:** directly violates "never begin building until
  approval." Rejected — analysis and building stay separated by an explicit gate.
- **Freeform notes instead of a fixed schema:** loses comparability and completeness across ideas.
  Rejected.
