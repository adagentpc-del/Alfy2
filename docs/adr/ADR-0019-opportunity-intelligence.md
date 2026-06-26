# ADR-0019: Opportunity Intelligence

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alyssa's ecosystem accumulates a lot of entities — contacts, businesses, vendors, investors, clients,
ideas, GitHub repositories, assets, past conversations, and market trends. The valuable connections
between them ("this developer also fits Divini Procure", "this GitHub repo solves Move Mi", "this
investor should meet this project", "this vendor should be introduced to this developer") are exactly
the things a busy operator misses. The platform should find those relationships itself and surface
them, ranked, instead of waiting to be asked.

## Decision

Add an `opportunity/` engine in `@alfy2/core` that continuously analyzes the ten entity sources, finds
relationships between them, and surfaces ranked opportunities. Deterministic (no AI). Tenant-scoped.

### Entities in, opportunities out

Each analyzable thing is normalized to an `EntityRef` — a reference (`ref_id` + `kind`) with a name,
optional business, tags, **keywords** (the matching signal), and structured `attributes` (role, sector,
revenue potential, repo verdict, …). `analyze(entities)` compares every pair and runs a set of
deterministic **matchers**, each detecting one relationship type by entity-kind pair plus keyword
overlap:

- **fit** — a contact (esp. a developer) fits a business/idea that needs their skills
- **solves** — a *safe* GitHub repo solves a business/idea problem
- **investment** — an investor should meet a project (idea/repo/business) matching their thesis
- **introduction** — a vendor should be introduced to a complementary contact
- **synergy** — an asset can accelerate a business/idea
- **trend_tailwind** — a market trend benefits a business/idea
- **partnership** — two businesses (or a client and a business) with strong overlap

### Ranked by five dimensions

Every opportunity is scored on **revenue, probability, effort, risk, and strategic value** (all 0..1),
then a weighted **composite** ranks them — positive dimensions add, while effort and risk enter
inverted (lower is better). Scores derive from the relationship type, keyword-overlap strength, the
target's revenue potential, a cross-business/cross-sector strategic boost, and signals like a repo's
GitHub-Intelligence verdict (a "needs review" repo scores riskier).

### Surface automatically, decide explicitly

`surface(threshold)` promotes `new` opportunities at or above a composite threshold to `surfaced` and
returns them ranked — the system raises its hand on its own. The operator then `accept`s, `dismiss`es,
or marks one `acted`. Re-analysis **upserts by signature** (`kind | source | target`), so running it
continuously refreshes scores without creating duplicates and preserves decisions already made.

### Contracts & data

`packages/shared/src/contracts/opportunity.ts`: `EntityKind` (10), `RelationshipKind`,
`OpportunityStatus`, `EntityRef`, `OpportunityScore`, `Opportunity`, `AnalyzeInput`, `ScoreWeights`.
(The TS `Opportunity`/`OpportunitySchema` are exported from the shared barrel as
`OpportunityIntel`/`OpportunityIntelSchema`, and mirrored in Pydantic as `OpportunityIntel`, to avoid
colliding with the Goal Engine's small `Opportunity` sub-type.) Migration 0026 adds `opportunities`
(source/target/scores as `jsonb`) + 0027 deny-by-default RLS.

## Consequences

- The connections an operator would otherwise miss get found and ranked automatically, with an
  explainable rationale and a recommended action + agents for each.
- Ranking is multi-dimensional and transparent — the five sub-scores are stored, so opportunities can
  be re-sorted by any single dimension (pure revenue, lowest effort, lowest risk, etc.), not just the
  composite.
- It is genuinely cross-subsystem: it consumes GitHub-Intelligence verdicts, asset references, business
  and idea records, and contact/investor/vendor data, turning the rest of the platform's memory into
  leverage.
- Real continuous operation — pulling the live corpus from Memory/Assets/GitHub Intelligence and
  running `analyze`/`surface` on a schedule — is Phase 2.
