# Alfy² — Pattern Engine

Alfy²'s self-awareness layer. It observes how the operator works over time, finds bottlenecks, and
recommends automations, new agents, and workflow improvements. Two rules, enforced by construction:
it is **advisory only — it never modifies behavior automatically**, and it **always explains** every
recommendation. Decision record: [`adr/ADR-0009`](./adr/ADR-0009-pattern-engine.md).

## What it observes (`BehaviorSignal`)
`work_session` (how you work) · `avoidance` (what you avoid) · `performance` (when you perform best) ·
`energy` · `stress` · `follow_up` · `sales` · `launch` · `meeting` · `decision`.

Input is a window of `BehaviorObservation`s: `{ at, signal, measure (0..1 | null), label, context }`.

## What it produces (a `PatternReport`)
| Field | What |
|---|---|
| `patterns` | detected regularities (e.g. "Performs best in the morning") with direction, strength, evidence, and a `detail` explanation |
| `bottlenecks` | friction points (area, severity, description, impact, evidence) |
| `recommended_automations` | automations to add — each with a required `explanation` |
| `recommended_agents` | new agents to create (Agent Registry keys → Agent Factory) — each explained |
| `workflow_improvements` | process changes — each explained |
| `summary` | the read in one line |
| `advisory_only` | always `true` |

## How it works
Deterministic analyzers (no AI): time-of-day averages for performance/energy/stress, bad-outcome
ratios for habit signals (late/missed/overran/reversed…), and repeat-count detection for avoidance.
Bottlenecks come from negative patterns; recommendations map from bottlenecks into the three lanes,
each carrying the evidence as its explanation.

## The two invariants
- **Never modifies behavior.** The engine holds no write/dispatch ports — `analyze()` returns a report
  and changes nothing. Every report is `advisory_only: true`. (The smoke asserts this.)
- **Always explains.** `explanation` (recommendations), `detail` (patterns), and `description`/`impact`
  (bottlenecks) are required and non-empty by contract, populated from the evidence. A recommendation
  without a reason can't be represented.

## API
```ts
const engine = new PatternEngine();
const report = engine.analyze(tenantId, observations); // BehaviorObservation[]
// report.advisory_only === true — nothing was changed
```

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/pattern-engine.ts` (+ Pydantic mirror in `workers/`) |
| Analyzers | `packages/core/src/pattern-engine/analyzers.ts` |
| Engine | `packages/core/src/pattern-engine/engine.ts` |
| Smoke test | `scripts/pattern-engine-smoke.mts` (`pnpm run pattern:smoke`) |

## Boundaries & integration
- Recommended agents are Agent Registry keys, feeding the **Agent Factory**; meeting fixes reference
  the **Chief of Staff**; automations feed the broader automation theme.
- Observations are supplied today; Phase 2 can source them from decisions, calendar, and memory.
- An AI/statistical analyzer can be added behind the deterministic floor without changing the contract
  or the advisory-only guarantee.
