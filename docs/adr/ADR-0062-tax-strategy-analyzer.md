# ADR-0062: Legal Tax Strategy Analyzer

**Status:** Accepted
**Date:** 2026-06-25

## Context

A founder leaves real money on the table every year for want of a structured, repeatable scan of where legal tax
strategy might apply. The work is genuinely valuable — and genuinely dangerous to automate carelessly, because
the line between legal optimization and illegal evasion is bright and Alfy² must never cross it or appear to give
advice. This ADR adds the Legal Tax Strategy Analyzer: a deterministic scan of fifteen areas that surfaces
*candidates* for a CPA or attorney to evaluate, never a filing, never advice, and never a strategy executed on
its own.

## Decision

Add a `tax-strategy/` engine in `@alfy2/core` that analyzes fifteen tax areas and emits structured, review-bound
recommendations. Deterministic, tenant-scoped. Every output is analysis-for-review, explicitly **legal
optimization only — avoidance, deferral, deduction, structuring, planning — never evasion.**

### Fifteen areas, structured recommendations

The Analyzer scans **fifteen tax areas** and, for each candidate it surfaces, records a fixed structure:
**`why_it_may_apply`**, **`estimated_benefit`**, **`risk_level`**, **`complexity`**,
**`requires_professional_review`**, **`documents_needed`**, **`next_step`**, and **`questions_for_advisor`**.
The recommendation is deliberately shaped as a brief for a professional, not an instruction for the platform —
it states why the area *may* apply, what it might be worth, what it would take, what to gather, and exactly what
to ask the advisor.

### Legal optimization, review required, advice never

`requires_professional_review` is **always `true`** on every recommendation, and the engine carries a standing
**disclaimer** that its output is analysis for a qualified professional's review, not tax advice. The framing is
non-negotiable: this is legal optimization — avoidance, deferral, deduction, structuring, planning — and never
evasion. Alfy² assembles the case aggressively and hands it to a CPA or attorney; it never files, never
executes, and never advises.

### Contracts & data

`packages/shared/src/contracts/tax-strategy.ts`: `TaxArea`, `TaxRecommendation`, `RiskLevel`, `Complexity`,
`TaxStrategyInput`, `TaxStrategyAnalysis`. Migrations `0107`/`0108` store the analyses **append-only**, so each
scan is preserved as a dated record for the advisor and for audit. Smoke `pnpm tax:smoke`.

## Consequences

- Every legal-tax candidate arrives in one shape — why it may apply, estimated benefit, risk, complexity,
  documents needed, next step, and questions for the advisor — ready to hand to a professional.
- `requires_professional_review` is always true and a standing disclaimer ships on every analysis: this is
  analysis for review, never advice.
- The engine is framed and constrained to **legal optimization only** — avoidance, deferral, deduction,
  structuring, planning — and never evasion.
- Analyses are append-only (migrations `0107`/`0108`), giving the advisor a dated record and the platform an
  audit trail.
- Phase 2 routes each recommendation's `questions_for_advisor` into the approval/professional-review queue;
  nothing is ever filed by the platform.
