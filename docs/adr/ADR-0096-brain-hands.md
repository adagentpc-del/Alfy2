# ADR-0096: Brain/Hands Separation

**Status:** Accepted
**Date:** 2026-06-25

## Context

An executive operator that recommends *and* executes without separation is dangerous: a single layer that both
decides and acts can quietly skip the policy, approval, and audit steps that protect the human. The platform
already splits itself into a Control Plane and an Execution Plane (ADR-0046); the L0 operator needs that split
named in operator terms and enforced for the cognitive-offloading stack. This ADR adds Brain/Hands Separation —
the layering that guarantees no action reaches the world without passing through governance.

## Decision

Add a `brain-hands/` registry in `@alfy2/core`. Deterministic, tenant-scoped. It tags every capability with a
**layer — Brain / Policy / Orchestrator / Execution (Hands)** — and its core method **`guard()`** denies any
execution-layer action that did not flow Brain → Policy → Orchestrator with an audit record.

### Four layers, one flow

The **Executive Brain recommends**, the **Policy Layer governs** (constitution / permissions / risk / approvals),
the **Orchestrator coordinates**, and the **Hands execute**. An `ExecFlowRequest` must show it was
`brain_recommended`, `policy_cleared`, `approved` (true / not-required), `orchestrator_routed`, and will be
`audited`. The hard invariant: **no execution bypasses policy, approval, or audit** — `guard()` returns
`bypass_attempt: true` and `allowed: false` for any action that tried to skip a layer, naming the `missing_layers`.

### Composition

It **composes the two Planes** (ADR-0046): Brain/Policy/Orchestrator map to the Control Plane, Hands to the
Execution Plane, and `guard()` is the operator-facing expression of the Planes' `guard()` — the same `bypass_attempt`
discipline, surfaced for the L0 stack.

### Contracts & data

`packages/shared/src/contracts/brain-hands.ts`: `Layer`, `LayerAssignment`, `ExecFlowRequest`, `FlowDecision`. No
migration — a static layer catalog plus a pure guard. Smoke `pnpm capstone:smoke`.

## Consequences

- The platform is layered Brain (recommends) / Policy (governs) / Orchestrator (coordinates) / Hands (executes).
- No execution bypasses policy, approval, or audit — `guard()` blocks any layer-skipping action as a `bypass_attempt`.
- It composes the Control/Execution Planes (ADR-0046), expressing their guard in operator terms for the L0 stack.
- No migration — static catalog plus a pure guard.
- Phase 2 wires `guard()` ahead of every Hands action in the cognitive-offloading pipeline.
