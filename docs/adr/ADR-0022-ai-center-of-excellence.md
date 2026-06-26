# ADR-0022: AI Center of Excellence

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² mints agents (Agent Factory), workflows, and connectors continuously. Without a standards layer
they drift — inconsistent names, untested agents, undocumented connectors, unapproved models,
runaway costs, irreversible actions with no approval gate. The platform needs an **internal standards
layer** that holds the approved patterns and **checks that every new agent, workflow, and connector
follows them** before it goes live.

## Decision

Add an `ai-coe/` engine in `@alfy2/core` — the AI Center of Excellence. It is a tenant-scoped registry
of approved standards plus a deterministic compliance checker.

### Standards library (eleven kinds)

`ApprovedStandard` records cover the eleven governed kinds: **prompt, agent_template, workflow_template,
security_standard, data_standard, naming_convention, testing_standard, documentation_standard,
escalation_rule, model_usage_rule, cost_control.** A standard carries a body (the prompt text /
template / prose) and a set of machine-checkable `rules`. Standards move draft → approved → deprecated.
A tenant is seeded with the default approved standards and can register its own.

### Compliance gate

`checkCompliance(target)` validates an agent / workflow / connector against the active approved
standards and returns the violations, a score, and pass/fail. The seeded rules check:

- **naming_convention** — lowercase dotted/kebab slug (error)
- **testing_standard** — has tests (error)
- **documentation_standard** — has docs (warning)
- **model_usage_rule** — model is on the approved list, routed via the Model Router (error)
- **cost_control** — estimated per-run cost ≤ the ceiling (warning)
- **security_standard** — irreversible actions are gated behind approval (error)

A target **passes only when there are no error-severity violations**. This is the gate every new agent,
workflow, and connector must clear.

### Contracts & data

`packages/shared/src/contracts/ai-coe.ts`: `StandardKind`, `StandardStatus`, `ApprovedStandard`,
`CreateStandardInput`, `ComplianceTarget`, `Violation`, `ComplianceResult`. Mirrored in Pydantic.
Migration 0034 adds `coe_standards` + 0035 deny-by-default RLS.

## Consequences

- There is one place that defines "good" for the platform, and one deterministic check that enforces
  it — so quality doesn't depend on whoever built the agent.
- The checker composes the rest of the platform: model-usage ties to the Model Router, the security
  rule ties to the Security Gate / Persistent Approval, cost-control ties to the AI Gateway budget.
- Standards are versioned and explainable; every violation names the rule and the fix.
- Wiring the Agent Factory and Connector Registry to run `checkCompliance` automatically before
  registering a new target (and blocking on failure) is Phase 2; the gate is ready now.
