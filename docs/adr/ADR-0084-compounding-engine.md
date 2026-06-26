# ADR-0084: Compounding Engine

**Status:** Accepted
**Date:** 2026-06-25

## Context

The platform completes tasks all day, and the overwhelming majority of that output is consumed once and
discarded. The single highest-leverage habit a founder can have is to ask, of every finished thing, "what
reusable asset could this become, and what will it create downstream?" — but no engine asks it systematically.
Output volume is the wrong target; compounding is the right one. This ADR adds the Compounding Engine to evaluate
every completed task for its reusable forms, score how hard it compounds, and maintain the lineage graph of what
each asset created.

## Decision

Add a `compounding/` engine in `@alfy2/core`. Deterministic, tenant-scoped. It evaluates every completed task for
**twenty-one reusable forms**, scores it on **eight compounding dimensions**, recommends creating the reusable
version, and maintains the **Asset Lineage Graph**.

### Evaluate, score, recommend

For every completed task the engine asks whether it should become one of **twenty-one reusable forms** — the SOPs,
templates, components, agents, workflows, and the rest of the shapes a one-off can take. It scores the task on
**eight compounding dimensions** — how reusable, how leveraged, how durable, how widely it could apply, and so on
— and from that recommends creating the reusable version when the score earns it. The engine's whole posture is to
optimize for compounding, not output volume: a task that compounds is worth more than ten that vanish.

### The Asset Lineage Graph

The engine maintains the **Asset Lineage Graph** — for every asset, what created it and what it created, which
businesses it touched, what revenue it drove, which agents and workflows it spawned, and its version. The graph is
how compounding becomes visible: it traces a single framework from its origin through every asset, dollar, and
agent it produced, so the founder can see which work actually compounded and which merely happened.

### Contracts & data

`packages/shared/src/contracts/compounding.ts`: `CompoundingEvaluation`, `ReusableForm`, `CompoundingDimension`,
`AssetLineage`, `CompoundingResult`. Migrations `0154`/`0155` store evaluations **append-only**, and `0156`/`0157`
store the **mutable** `asset_lineage` graph (lineage updates as an asset creates more). Smoke
`pnpm compounding:smoke`.

## Consequences

- Every completed task is evaluated for twenty-one reusable forms and scored on eight compounding dimensions,
  with a recommendation to create the reusable version when it earns it — the platform optimizes for compounding,
  not output volume.
- The Asset Lineage Graph traces what created each asset and what it created (businesses / revenue / agents /
  workflows / version), making compounding visible.
- Evaluations are append-only (`0154`/`0155`); the lineage graph is mutable (`0156`/`0157`) so it grows as assets
  create more.
- The engine feeds the Multiplication, Leverage, and Legacy engines with the lineage they reason over.
- Phase 2 auto-evaluates tasks on completion and surfaces high-compounding recommendations in the executive views.
