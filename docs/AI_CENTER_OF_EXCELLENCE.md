# AI Center of Excellence

The AI Center of Excellence is Alfy²'s internal standards layer. It holds the approved patterns — the
prompt library, agent and workflow templates, and the security/data/naming/testing/documentation/
escalation/model-usage/cost standards — and it **checks that every new agent, workflow, and connector
follows them** before it goes live. Deterministic. Tenant-scoped.

Module: `packages/core/src/ai-coe/`. Contracts: `packages/shared/src/contracts/ai-coe.ts` (mirrored in
`workers/`). Migrations: `0034_ai_coe_standards.sql`, `0035_ai_coe_standards_rls.sql`. ADR:
`docs/adr/ADR-0022-ai-center-of-excellence.md`. Smoke: `pnpm coe:smoke`.

## The standards library (eleven kinds)

`prompt` · `agent_template` · `workflow_template` · `security_standard` · `data_standard` ·
`naming_convention` · `testing_standard` · `documentation_standard` · `escalation_rule` ·
`model_usage_rule` · `cost_control`.

Each `ApprovedStandard` carries a body (the prompt text, the template, or the standard's prose) and a
set of machine-checkable `rules`. Standards move **draft → approved → deprecated**. A tenant is seeded
with default approved standards and can register and approve its own.

## The compliance gate

`checkCompliance(target)` validates an agent / workflow / connector against the active approved
standards and returns the violations, a score, and pass/fail. The seeded checks:

| Standard | Rule | Severity |
| --- | --- | --- |
| naming_convention | lowercase dotted/kebab slug | error |
| testing_standard | has tests | error |
| documentation_standard | has docs | warning |
| model_usage_rule | model is on the approved list (Model Router) | error |
| cost_control | est. per-run cost ≤ ceiling | warning |
| security_standard | irreversible actions gated behind approval | error |

A target **passes only when there are no error-severity violations**. Every violation names the rule
and the fix, so a failing agent/workflow/connector knows exactly what to correct.

## Composes the platform

The checks tie the standards to the rest of Alfy²: model-usage routes through the **Model Router**, the
security rule ties to the **Security Gate / Persistent Approval**, and cost-control ties to the **AI
Gateway** budget.

## Tenant isolation

Every method is tenant-scoped; standards never cross tenants, matching the RLS on `coe_standards`.

## Wiring (Phase 2)

The registry is in-memory today. Phase 2 has the Agent Factory and Connector Registry run
`checkCompliance` automatically before registering a new target, blocking on failure.
