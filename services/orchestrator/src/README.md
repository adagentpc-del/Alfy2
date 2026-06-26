# @alfy2/orchestrator

The control loop (Phase 2). Drives a request through:
Plan (ask modules) → Dispatch (to agents) → Assemble (Signal→Action) → Gate (approvals) → Record (logs).

Uses `@alfy2/core` for the registries, dispatcher transport, approval gate, and log writers.
Transport is abstracted so HTTP (now) can become a queue later without changing this service.
