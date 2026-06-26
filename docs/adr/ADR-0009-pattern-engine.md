# ADR-0009 — Pattern Engine

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Alfy² should learn how the operator actually works — when they perform best, what they avoid, where
energy and stress run, and how their follow-up, sales, launch, meeting, and decision habits play out —
then surface bottlenecks and recommend automations, new agents, and workflow changes. Two rules are
non-negotiable: **never modify behavior automatically**, and **always explain recommendations.**

## Decision
1. **Observe a structured stream, analyze deterministically.** Input is a window of
   `BehaviorObservation`s (timestamp + signal + optional 0..1 measure + label + context). Analyzers
   are deterministic: time-of-day averages for performance/energy/stress, bad-outcome ratios for
   habit signals (follow_up/sales/launch/meeting/decision), and repeat-count detection for avoidance.
   No AI — every result reports its evidence count.
2. **Advisory only, by construction.** The engine holds **no write or dispatch ports**. `analyze()`
   returns a `PatternReport` and changes nothing; every report is stamped `advisory_only: true`. It
   cannot modify behavior even if asked — there is no code path that acts.
3. **Always explain.** The contract makes `explanation` (recommendations), `detail` (patterns), and
   `description`/`impact` (bottlenecks) required and non-empty. The engine populates them from the
   evidence (counts, ratios, the specific window). A recommendation without a reason cannot be
   represented.
4. **Recommend across three lanes, tied to the rest of the system.** Bottlenecks map to
   `recommended_automations`, `recommended_agents` (Agent Registry keys, e.g. `business.followup`,
   `sales.outreach` — feeding the Agent Factory), and `workflow_improvements`. Meeting recommendations
   reference the Chief of Staff; agent recommendations reference the Agent Factory.

## Consequences
- **Positive:** the operator gets an explainable, evidence-backed read on their own patterns and a
  prioritized set of fixes; the "never act automatically" guarantee is structural, not a promise; the
  recommendations plug directly into the Agent Factory and Chief of Staff.
- **Cost:** quality depends on the observation stream, which is supplied (no live sensors yet);
  thresholds (e.g. the 0.4 bad-outcome bottleneck cutoff, the 3× avoidance floor) need tuning; the
  analyzers are heuristics, not statistics.
- **Mitigation:** observations can later be sourced automatically from decisions, calendar, and memory
  in Phase 2; thresholds are centralized and data-only; a statistical/AI analyzer can be added without
  changing the contract or the advisory-only guarantee.

## Alternatives considered
- **Let the engine auto-apply fixes (e.g. auto-block calendar):** directly violates "never modify
  behavior automatically." Rejected — it only ever recommends.
- **Free-text insights:** loses the evidence link and comparability, and makes "always explain" a
  convention rather than a contract. Rejected.
- **AI behavioral analysis up front:** adds cost and opacity to a trust-sensitive feature; deferred
  behind the deterministic floor.
