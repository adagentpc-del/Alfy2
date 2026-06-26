# Opportunity Intelligence

Opportunity Intelligence continuously analyzes everything in Alyssa's ecosystem and finds the valuable
connections between entities that a busy operator would otherwise miss — then surfaces them, ranked. It
turns the rest of the platform's memory (contacts, businesses, GitHub repos, assets, market trends, …)
into leverage. Deterministic (no AI). Tenant-scoped.

Module: `packages/core/src/opportunity/`. Contracts: `packages/shared/src/contracts/opportunity.ts`
(mirrored in `workers/`). Migrations: `0026_opportunities.sql`, `0027_opportunities_rls.sql`. ADR:
`docs/adr/ADR-0019-opportunity-intelligence.md`. Smoke: `pnpm opportunity:smoke`.

## The ten sources

It analyzes **contacts, businesses, vendors, investors, clients, ideas, GitHub repositories, assets,
past conversations, and market trends.** Each is normalized to an `EntityRef`: a reference (`ref_id` +
`kind`) with a name, optional business, tags, **keywords** (the matching signal), and `attributes`
(role, sector, revenue potential, repo verdict, …).

## Relationships it finds

`analyze(entities)` compares every pair and detects relationships — the canonical examples:

- **This developer also fits Divini Procure** (`fit` — contact ↔ business/idea)
- **This GitHub repo solves Move Mi** (`solves` — safe repo ↔ business/idea)
- **This investor should meet this project** (`investment` — investor ↔ idea/repo/business)
- **This vendor should be introduced to this developer** (`introduction` — vendor ↔ contact)

plus **synergy** (asset ↔ business), **trend_tailwind** (market trend ↔ business), and **partnership**
(business ↔ business). Each opportunity carries a plain-language title, a rationale, the evidence
(shared keywords, repo verdict), a recommended action, and recommended agents.

## Ranked by five dimensions

Every opportunity is scored on **revenue, probability, effort, risk, and strategic value** (each 0..1),
and a weighted **composite** ranks them. Effort and risk are "lower is better," so they enter the
composite inverted. The five sub-scores are stored, so opportunities can be re-sorted by any single
dimension — pure revenue, lowest effort, lowest risk — not just the composite. Scores reflect the
relationship type, how strongly the entities overlap, the target's revenue potential, a
cross-business/cross-sector strategic boost, and signals like a repo's GitHub-Intelligence verdict.

## Surface automatically, decide explicitly

`surface(threshold)` promotes the strongest `new` opportunities (composite at/above the threshold,
default 0.5) to `surfaced` and returns them ranked — the system raises its hand on its own. The
operator then `accept`s, `dismiss`es, or marks one `acted`. `top(n)` returns the best opportunities not
yet dismissed or acted.

## Continuous, without duplicates

Re-running `analyze` **upserts by signature** (`kind | source | target`): scores refresh, but
opportunities are never duplicated and decisions already made (accepted/dismissed/acted) are preserved.
That makes it safe to run continuously.

## Tenant isolation

Every method is tenant-scoped; opportunities never cross tenants, matching the RLS on `opportunities`.

## Wiring (Phase 2)

The engine is in-memory today. Phase 2 pulls the live corpus from the Memory Engine, Global Asset
Library, and GitHub Intelligence, and runs `analyze` + `surface` on a schedule so new opportunities
appear automatically as the ecosystem grows.
