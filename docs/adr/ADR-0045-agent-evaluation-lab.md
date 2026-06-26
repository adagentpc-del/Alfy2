# ADR-0045: Agent Evaluation Lab

**Status:** Accepted
**Date:** 2026-06-25

## Context

Agents earn permissions. The mission rule is that no agent is trusted until it has been tested — broad
permissions (money, external messages, production, deletion) must follow proof, not precede it. Agent
Identity & Zero Trust (ADR-0025) already starts every agent deny-by-default and opens capabilities only via
grant; the AI Center of Excellence (ADR-0022) already validates an agent against standards. What was missing
is the empirical step between the two: a place where an agent is run against test tasks, failure cases, and
risk checks and scored before anyone hands it the keys.

## Decision

Add an `agent-eval/` engine in `@alfy2/core`. It runs an agent through an evaluation suite, scores it, and
gates promotion on the result. Deterministic, tenant-scoped.

### The suite and the five scores

An evaluation is a set of cases. Each case carries an input, an **expected output**, and a flag for whether
it is a **failure case** (an input the agent is supposed to refuse or fail safely) and whether it is a
**risk check**. Running the suite produces five scores, each `0..1`: **accuracy** (output matches
expectation), **usefulness** (the output advances the task), **cost** and **speed** (inverse of measured
cost and runtime — cheaper and faster score higher), and **reliability** (consistency across cases). The
scores are concrete and comparable, not vibes.

### Pass and the six-stage ladder

An agent **passes** when accuracy, reliability, and usefulness all clear the threshold (default `0.8`) **and**
no risk is flagged on a non-failure case — flagging risk on a case designed to fail is correct behavior, not
a failure. Agents move along a six-stage ladder: `draft → testing → limited_use → approved → production →
retired`. The early stages are open; the gated stages (`approved`, `production`) are where broad permissions
become available, marked by `broad_permissions_allowed`.

### Promotion is gated

`promote()` into a gated stage **throws** unless the agent has passed evaluation. There is no path to
`approved` or `production` — and therefore no path to broad permissions — that skips the lab. The open stages
(`limited_use` and below) can be reached without a pass so an agent can do narrow, supervised work while it
earns its score, but the trusted stages cannot.

### Contracts & data

`packages/shared/src/contracts/agent-eval.ts`: `EvalCase`, `EvalScores`, `EvalResult`, `AgentStage`,
`AgentEvaluation`. Migrations `0079` adds `agent_evaluations` + `0080` RLS. Composes Agent Identity & Zero
Trust (the identity says who; the lab says whether it has earned more) and the AI Center of Excellence (the
CoE says it meets standards; the lab says it works).

## Consequences

- No agent reaches money, production, or broad reach on a promise — it reaches them on a passing score, with
  the five sub-scores recorded for audit and comparison.
- Failure cases and risk checks are first-class, so "refuses correctly" is rewarded rather than penalized.
- Phase 2 swaps the deterministic scorers for live runs behind the same `evaluate()` surface and wires the
  lab into the Agent Factory so a generated agent is evaluated before it is ever promoted.
