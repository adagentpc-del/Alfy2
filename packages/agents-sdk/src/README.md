# @alfy2/agents-sdk

Thin TypeScript helpers for the orchestrator side of the agent relationship: build valid `Task`
envelopes, register agents into the registry, and parse `SignalToAction` results. The Python worker
side mirrors these via `workers/alfy_workers/contracts`.

Phase 1+: `defineAgent()`, `buildTask()`, `registerAgent()`. Contracts come from `@alfy2/shared`.
