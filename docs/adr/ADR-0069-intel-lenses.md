# ADR-0069: Intelligence Lenses (Why This Matters + Contrarian View)

**Status:** Accepted
**Date:** 2026-06-25

## Context

Raw intelligence still leaves two gaps. The first is relevance: an item can be true and important in general yet
say nothing actionable about *Alyssa's* businesses. The second is groupthink: an item can be compelling precisely
because it is the consensus, and a platform that only amplifies the mainstream view will walk a founder
confidently into a hype-driven mistake. This ADR adds two intelligence lenses — Why This Matters, which
translates any item into decisions for Alyssa's businesses, and Contrarian View, which deliberately builds the
strongest case against it.

## Decision

Add two engines under `intel-lenses/` in `@alfy2/core`: a Why-This-Matters lens and a Contrarian-View lens, each
a compute read-model over an intelligence item. Deterministic, tenant-scoped.

### Why This Matters — translate into decisions

The Why-This-Matters lens turns any item into concrete consequences for Alyssa's businesses: the **businesses
affected**, whether anything **needs to change**, a possible **competitive advantage**, a **compliance risk**, a
**product opportunity**, a **test-or-ignore** call, the **assets, agents, and workflows to update**, and a
**strategy-review tier.** It answers "so what, for me?" — converting an interesting item into the specific moves
it implies for the portfolio.

### Contrarian View — the strongest opposing case

The Contrarian-View lens deliberately constructs the **strongest credible opposing case**, not a token caveat:
the **mainstream view versus the contrarian view**, the **evidence on both sides**, the **ignored risks**, the
**questionable assumptions**, the **barriers**, the **compliance** angle, the **business-model weaknesses**, the
**execution risks**, and a **recommendation.** Its job is to reduce blind spots and stop hype-driven decisions
by making the best argument *against* whatever looks obvious, so a decision survives its own strongest critic.

### Contracts & data

`packages/shared/src/contracts/intel-lenses.ts`: `WhyThisMatters`, `ContrarianView`, `StrategyReviewTier`,
`LensInput`. There is **no migration** — both lenses are compute read-models over an intelligence item, holding
no state of their own. Smoke `pnpm whymatters:smoke` and `pnpm contrarian:smoke`.

## Consequences

- Why This Matters translates any item into portfolio decisions: businesses affected, what needs to change, a
  competitive advantage, compliance risk, product opportunity, test/ignore, assets/agents/workflows to update,
  and a strategy-review tier.
- Contrarian View constructs the strongest credible opposing case — mainstream vs contrarian, evidence both
  sides, ignored risks, questionable assumptions, barriers, compliance, business-model weaknesses, execution
  risks, and a recommendation — to cut blind spots and prevent hype-driven decisions.
- Both lenses are **read models with no migration**, computed on demand over an intelligence item.
- Together they make intelligence both relevant and stress-tested before it reaches a decision.
- Phase 2 attaches both lenses to Executive Intelligence Network items in the briefings and executive views.
