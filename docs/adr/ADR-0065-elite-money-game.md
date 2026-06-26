# ADR-0065: Elite Money Game Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The strategies wealthy operators actually use — holding companies, management fees, owner compensation
structures, retirement and self-directed vehicles, trusts, asset protection, compliant offshore structures — are
no secret, but they are scattered, intimidating, and easy to misapply. A founder benefits enormously from a
single catalog that lays them out plainly and assembles a ranked, downside-first plan, *provided* the catalog
never pretends to execute them or drifts from legal avoidance into anything else. This ADR adds the Elite Money
Game Engine: a seventeen-strategy catalog and a planner that protects the downside first and stays strictly to
legal avoidance.

## Decision

Add a `money-game/` engine in `@alfy2/core` that holds a catalog of seventeen wealth strategies and assembles a
ranked plan from them. Deterministic, tenant-scoped. It analyzes and ranks aggressively; every strategy is
executed only by an advisor, never by the platform.

### The seventeen-strategy catalog

The catalog holds **seventeen strategies**: **holding company, operating company, IP company, management fees,
owner compensation, retirement plans, SDIRA, Solo 401(k), trusts, real estate, investments, deductions,
charitable, insurance, asset protection, estate, and compliant offshore.** Each entry is described uniformly —
**what** it is, **when** it applies, **when not**, its **benefits**, its **risks**, its **compliance**
requirements, the **advisor** who executes it, its **complexity**, and the **steps** involved — so a strategy is
never a buzzword but a structured, legible option.

### A downside-first, legal-only plan

`analyze()` assembles a **ranked plan** from the catalog against Alyssa's situation, with two invariants always
true: **`protect_downside_first`** and **`legal_avoidance_only`.** The plan leads with protection before
upside, and it is explicitly legal avoidance — never evasion. Execution belongs to the advisor named on each
strategy: the engine never moves money, opens an account, files anything, or signs. It is the playbook and the
ranking; the CPA, attorney, or advisor carries it out under Alyssa's approval.

### Contracts & data

`packages/shared/src/contracts/money-game.ts`: `MoneyStrategy`, `StrategyId`, `MoneyGameInput`, `MoneyGamePlan`,
`RankedStrategy`. Migrations `0113`/`0114` store assembled plans **append-only**, preserving each ranking as a
dated record for the advisors reviewing it. Smoke `pnpm moneygame:smoke`.

## Consequences

- The wealth playbook is one catalog of seventeen strategies, each with what/when/when-not/benefits/risks/
  compliance/advisor/complexity/steps — legible options, not jargon.
- `analyze()` returns a ranked plan with `protect_downside_first` and `legal_avoidance_only` always true: the
  plan protects before it optimizes and stays strictly to legal avoidance, never evasion.
- Execution is the advisor's: the engine never moves money, opens accounts, files, or signs.
- Plans are append-only (migrations `0113`/`0114`), giving advisors and audit a dated record of each ranking.
- Phase 2 surfaces the plan in the finance suite and routes each strategy's steps to its named advisor behind
  the approval gate.
