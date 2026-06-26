# Alfy2 Python workers

Agent workers live here, one subpackage per agent family under `alfy_workers/`. Each worker:
- receives a `Task` (validated against the Pydantic mirrors in `alfy_workers/contracts`),
- does its work statelessly,
- returns a `SignalToAction` result (always with an `explanation`),
- performs no side effects except via returned `next_actions`,
- never calls a model directly — model use is brokered by the core AI Gateway.

## Setup
```bash
uv sync          # install deps into .venv
```

## Layout
- `alfy_workers/contracts/` — Pydantic models mirroring `packages/shared` (kept in lockstep).
- `alfy_workers/reference_agent/` — Phase-2 echo/no-op agent proving the Task contract end-to-end.

Add a family: create `alfy_workers/<family>/`, implement the contract, register it in `agent_registry`.
