# ADR-0046: Control Plane / Execution Plane

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² has grown a large set of engines, and they fall into two natures. Some decide what is *allowed* —
policy, identity, permissions, approvals, routing, evaluation, observability, audit, cost, risk. Others
*do work* — agents, workflows, automations, connectors, tools, campaigns, repo actions, content. Until now
that split was implicit. The mission framing makes it the architecture: a **Control Plane** that governs and
an **Execution Plane** that acts, with the rule that execution may move fast only inside Control Plane
boundaries. This ADR names the split and gives it a registry and a guard.

## Decision

Add a `planes/` registry in `@alfy2/core` that tags every engine to a plane and a concern, and a `guard()`
that no execution action may bypass. Static architecture metadata — no migration. Tenant-scoped.

### Two planes, eighteen concerns

The **Control Plane** owns ten concerns: policy, identity, permissions, approvals, routing, evaluations,
observability, audit logs, cost controls, and risk controls. The **Execution Plane** owns eight: agents,
workflows, automations, connectors, tools, campaigns, repo actions, and content generation. The existing
control engines — Security Gate, Agent Identity, Persistent Approval, Model Router, Agent Evaluation Lab,
Observability, Audit Log, Cost CFO, Source-of-Truth — are the Control Plane. The execution engines — Agent
Factory, Domain Models, Follow-Up Autopilot, Connectors, GitHub Intelligence, Campaigns, War Room, Sales
Asset Generator, Knowledge Vault — are the Execution Plane.

### The catalog

`PLANE_CATALOG` is the static map: each engine is listed with its plane and its concern. It is the single
place to answer "is this a control capability or an execution capability, and what does it govern or do?" —
data, not scattered convention.

### The guard

`guard(ExecutionRequest)` is the chokepoint. It allows an execution action **only if** identity is verified,
policy has been checked, and the action is permitted — and, when approval is required (`approved !== null`),
only if `approved === true`. Any missing gate makes the request a **`bypass_attempt`** and the action is
denied. The rule is mechanical: execution cannot leave the Execution Plane without passing through the
Control Plane. No agent may bypass the Control Plane.

### Contracts & data

`packages/shared/src/contracts/planes.ts`: `Plane`, `ControlConcern`, `ExecutionConcern`, `PlaneEntry`,
`ExecutionRequest`, `GuardResult`. There is **no migration** — the catalog is static architecture metadata,
not tenant state.

## Consequences

- The platform now has an explicit spine: a governing plane and an acting plane, with the boundary expressed
  as code (`guard`) rather than as discipline. Every existing engine has a documented plane and concern.
- A `bypass_attempt` is a named, deniable event — attempts to act without identity/policy/permission/approval
  are caught at one point, not relied upon to be avoided.
- Phase 2 wires `guard()` ahead of the real execution paths and feeds bypass attempts into Observability and
  the Audit Log.
