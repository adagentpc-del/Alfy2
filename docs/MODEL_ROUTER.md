# Alfy² — Model Router

Alfy² never depends on a single AI provider. The Model Router scores registered models per task type
and returns the best one plus a **cross-provider fallback chain**. Models are registry *data*, so
current and future models are added without code changes. Decision record:
[`adr/ADR-0012`](./adr/ADR-0012-router-and-connectors.md).

## Models are data
A `ModelDescriptor` = `{ id, name, provider, local, available, cost_tier, context_window, strengths,
notes }`, where `strengths` maps each task type to a 0..1 score. The default catalog seeds Claude Code,
GPT-5.5, GPT Codex, OpenClaw, and a local model — and `register()` adds any future model instantly.

## Routes by task type
`route(task, constraints?)` for: **coding · reasoning · writing · debugging · planning · research ·
architecture · summarization**. With the default catalog it picks the code specialist for coding, the
reasoning specialist for reasoning, the all-rounder for architecture, and so on — and returns the full
ranking plus a fallback chain.

Constraints: `prefer_local` (boost local models), `max_cost_tier` (cap spend), `require_available`
(skip offline models).

## Never depends on one provider
The fallback chain **leads with a model from a different provider** than the chosen one, so a single
provider's outage never blocks work. The smoke asserts the first fallback is a different provider.

## The router decides; the AI Gateway executes
`route()` returns a model id and rationale. The existing AI Gateway (flag → cache → budget → usage)
makes the actual call. The router is pure selection — provider-agnostic by construction.

## API
```ts
const router = new ModelRouter();            // seeded with DEFAULT_MODEL_CATALOG
router.route("coding");                       // → { chosen_model_id, ranked, fallbacks, rationale }
router.route("summarization", { prefer_local: true });
router.register({ id: "future-omega", name: "…", provider: "acme", strengths: { coding: 0.99 } });
// → now wins coding immediately, with no code change
```

## The pieces
| Piece | Location |
|---|---|
| Contracts (Zod) | `packages/shared/src/contracts/model-router.ts` (+ Pydantic mirror) |
| Default catalog (data) | `packages/core/src/model-router/catalog.ts` |
| Router | `packages/core/src/model-router/router.ts` |
| Smoke test | `scripts/router-connector-smoke.mts` (`pnpm run router:smoke`) |

## Boundaries
- Capability scores are curated estimates — data, easy to tune; a live-benchmark or learned scorer can
  replace the heuristic behind the same `route()` API.
- This is selection, not execution; the AI Gateway runs the chosen model.
