# ADR-0025: Agent Identity & Zero Trust

**Status:** Accepted
**Date:** 2026-06-25

## Context

Alfy² runs a growing population of agents. Each one needs a real identity with explicit boundaries, and
nothing it does should be trusted implicitly. The platform needs every agent to have a unique identity,
a role, a scope, permissions, data boundaries, tool access, a spending limit, an external-communication
limit, approval requirements, and the ability to be revoked — and the default for a new agent must be
maximally safe.

## Decision

Add an `agent-identity/` registry in `@alfy2/core` that issues unique, scoped, revocable identities and
evaluates access **per request** under zero trust. Deterministic. Tenant-scoped.

### Deny-by-default identity

`issue()` creates an `AgentIdentity` with secure defaults: **read-only — no write, no money, no
external messages, no production changes, no deletion**, zero spending limit, zero external-comm limit,
no tools, and all six sensitive action classes flagged for approval. Capabilities are explicit boolean
flags; data boundaries and tool access are allow-lists; the agent_key is unique per tenant.

### Grants open specific capabilities

`grant()` merges in exactly what an agent should be able to do — specific capabilities, tools, data
namespaces, scope, a spending limit, an external-comm allowance. Nothing is opened that isn't granted.

### Zero-trust evaluation

`evaluate(request)` decides **allow / deny / needs_approval** for each request, deny-by-default:

- unknown or non-active identity → **deny**
- reads → **allow** within the identity's data boundaries
- any restricted action (write/spend/external/production/delete) → needs the matching capability, else **deny**
- spend → also bounded by the spending limit (**deny** over the cap)
- external_comm → needs a non-zero daily allowance
- a granted action whose class is in `requires_approval_for` → **needs_approval**, not a bare allow
- `use_tool` → the tool must be in the allow-list
- a data namespace outside the boundaries → **deny**

`suspend()` and `revoke()` cut access (revoke is terminal).

### Contracts & data

`packages/shared/src/contracts/agent-identity.ts`: `AgentIdentity`, `AgentCapabilities`,
`IssueAgentIdentityInput`, `AgentAccessRequest`, `ZeroTrustDecision`. Migration 0040 adds
`agent_identities` + 0041 deny-by-default RLS.

## Consequences

- A new agent can do almost nothing until explicitly trusted — the safe default is the only default.
- Every action is checked against the agent's own identity, so trust is per-agent and per-request, not
  ambient. This complements the Security Gate (which checks the *action*); the identity registry checks
  *who* is asking.
- Revocation is real and immediate — a compromised or misbehaving agent is shut off in one call.
- Phase 2 wires the Agent Factory to issue an identity for each generated agent and has the orchestrator
  call `evaluate` before dispatching any agent action.
