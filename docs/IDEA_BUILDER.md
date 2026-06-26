# Alfy² — Idea Builder

Alfy²'s 0→1 engine. Say **"I have an idea."** and it produces a complete fifteen-section workup, then
stops: it **never begins building until you approve**. Decision record:
[`adr/ADR-0008`](./adr/ADR-0008-idea-builder.md).

## The fifteen sections (an `IdeaBlueprint`)
`market_research · competitors · pricing · offer · positioning · mvp · database · api_needs ·
required_agents · marketing · seo · launch · monetization · risks · recommendation`

Plus a title, the Decision Engine's `category` + `priority_score`, an `explanation`, and the gate
fields `approved` / `status`.

## How it works
1. **Trigger** — the phrase `IDEA_BUILDER_TRIGGER = "I have an idea."` launches it.
2. **Classify** — the idea runs through the Decision Engine (category, priority) which feeds the
   recommendation.
3. **Generate** — deterministic generators fill all fifteen sections from the idea text and shape
   heuristics (marketplace? app? SaaS? sensitive domain?). Research-flavored sections are framed as
   **hypotheses + open questions**, not fetched facts — they tell you *what to validate*.
4. **Capture** — the idea is remembered (Memory Engine, kind `idea`). Recording ≠ building.
5. **Stop at the gate** — returns `status: "awaiting_approval"`, `approved: false`, and a
   recommendation whose `next_step` asks for approval.

## Never builds until approved
- `build()` constructs nothing — only the blueprint.
- `handoff()` (the bridge to building) **throws `IdeaApprovalError` unless `blueprint.approved` is
  true**, and even then only returns the *plan* of what would be built (agents to create via the Agent
  Factory, MVP tasks). The operator drives the actual build from there.

## API
```ts
const builder = new IdeaBuilder(decisionEngine, { memory: memoryEngine });
const blueprint = await builder.build(tenantId, { text: "I have an idea: …" });
// blueprint.status === "awaiting_approval"  — nothing built

builder.handoff(blueprint);                       // throws IdeaApprovalError
builder.handoff({ ...blueprint, approved: true }); // returns the build plan only
```

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/idea-builder.ts` (+ Pydantic mirror in `workers/`) |
| Builder + approval gate | `packages/core/src/idea-builder/builder.ts` |
| Section generators | `packages/core/src/idea-builder/generators.ts` |
| Smoke test | `scripts/idea-builder-smoke.mts` (`pnpm run idea:smoke`) |

## Boundaries
- **No building without approval** — enforced by the gate, the `status`, and the throwing `handoff()`.
- **Deterministic, honest** — no live web, no invented market numbers; research sections are
  hypotheses. An AI/research agent can deepen them later behind the gated AI Gateway, without changing
  the contract or the gate.
- Ideas are captured to memory so they're comparable and revisitable over time.
