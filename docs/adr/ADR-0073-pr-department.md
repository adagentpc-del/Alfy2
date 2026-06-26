# ADR-0073: PR Department

**Status:** Accepted
**Date:** 2026-06-25

## Context

The Business Template (ADR-0006) gives every business a standard set of departments so a new venture inherits a
complete operating shape on day one. Until now PR was not among them — yet for a founder building in public,
running a podcast, and chasing media angles, public relations is not optional, it is standard infrastructure.
This ADR adds PR as the thirteenth standard department and a generator that produces a real PR strategy for any
business.

## Decision

Make PR the **thirteenth standard department** in the Business Template and add a `pr/` generator in
`@alfy2/core`. Deterministic, tenant-scoped. Every business now inherits PR the way it inherits every other
department.

### PR as standard infrastructure

The Business Template's `template.ts` is edited so PR joins the standard departments — the template now defines
**thirteen departments**, and every business created from it inherits PR automatically. `DepartmentKind` gains
**`pr`**, so the new department is a first-class member of the schema rather than a bolt-on.

### The PR generator

The PR generator produces a working PR strategy for a business: **media angles, target publications, podcast
targets, a founder-story angle, credibility proof, a press-kit checklist, outreach templates, and reputation
risks.** It turns "we should do PR" into a concrete, business-specific plan — where to pitch, what the story is,
what proof backs it, what the press kit still needs, and what reputational exposure to watch. It complements the
Podcast suite: podcast targets here, the booking engine there.

### Contracts & data

`packages/shared/src/contracts/pr.ts`: `PRStrategy`, `MediaAngle`, `PublicationTarget`, `PressKitItem`,
`ReputationRisk`, `PRInput`; `DepartmentKind` gains `pr`. Migrations `0129`/`0130` add `pr_strategies`, and
migration `0131` **widens the `business_departments` CHECK** to allow `'pr'`. The PR department is covered by
`pnpm business:smoke`, which now exercises **thirteen** departments.

## Consequences

- PR is now standard for every business: the Business Template defines thirteen departments and every business
  inherits PR.
- The PR generator produces a concrete strategy — media angles, target publications, podcast targets, a
  founder-story angle, credibility proof, a press-kit checklist, outreach templates, and reputation risks.
- `DepartmentKind` gains `pr`; migrations `0129`/`0130` add `pr_strategies` and migration `0131` widens the
  `business_departments` CHECK to permit `'pr'`.
- Coverage rides on `pnpm business:smoke`, which now exercises thirteen departments.
- Phase 2 surfaces the PR strategy in each business's dashboard and feeds podcast targets to the guest-booking
  and studio engines.
