# ADR-0003 — Decision Engine

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Alfy² must turn any incoming input — an email, a voice note, an idea, a task — into a structured,
triaged decision: what kind of thing is it, how urgent/important/risky is it, what will it take, who
should do it, by when, and can it be automated. This is the connective tissue between raw input and
the orchestration loop (planner → agents → approval gate).

## Decision
1. **Deterministic by default.** Classification and scoring use transparent keyword/signal lexicons
   and explicit formulas — no AI in the default path. Every score records the signals that produced
   it, so decisions are explainable and reproducible, and the engine is effectively free to run
   (consistent with the cost-control posture).
2. **Multi-label classification.** Inputs get an array of scored categories (from
   business/personal/health/finance/relationship/idea/learning/risk/opportunity) plus a dominant
   `primary_category`. Risk and Opportunity are real categories but, because they cross-cut domains,
   the lexicons keep urgency words out of the risk category (urgency is its own dimension) so a risky
   business task still reads as primarily *business*.
3. **A swappable classifier port.** The engine depends on a `DecisionClassifier` interface, not a
   concrete classifier. The rule classifier ships today; an AI classifier can replace it later behind
   the gated AI Gateway without touching the engine or its output contract.
4. **One structured output contract.** `Decision` (in `packages/shared`) carries every requested
   dimension plus routing (`required_approvals`, `recommended_agents`, `recommended_deadline`,
   `automation_opportunities`) and an always-present `explanation` + `reasons`.
5. **Wires into existing subsystems.** `recommended_agents` use Agent Registry keys;
   `required_approvals` feed the Approval Gate; a Decision can be persisted as a `decision`-kind
   Memory. No new table — decisions live in the Memory Engine / existing decision log.

## Consequences
- **Positive:** instant, explainable triage of any input; free to run; clean upgrade path to AI
  classification; outputs route directly into the orchestration loop.
- **Cost:** keyword lexicons are blunt — they can mis-weight unusual phrasings and need occasional
  tuning. Tuning is low-risk (data-only, cannot break the contract) and every score is auditable via
  `reasons`.
- **Mitigation:** the classifier port allows a semantic/AI classifier to supersede the lexicons where
  quality matters, while keeping the deterministic path as the cheap default and fallback.

## Alternatives considered
- **AI classification up front:** higher accuracy on edge phrasings, but adds model cost/latency and a
  dependency to a foundational, high-frequency component. Deferred behind the port.
- **Single-label classification:** simpler, but loses the reality that inputs are often business *and*
  finance *and* risk at once. Rejected.
- **A dedicated `decisions` table for engine output:** redundant with the Memory Engine
  (`kind = decision`) and the existing decision log; rejected to avoid a third home for the concept.
