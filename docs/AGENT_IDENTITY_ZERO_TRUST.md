# Agent Identity & Zero Trust

Every agent in Alfy² gets a unique, scoped, revocable identity, and nothing it does is trusted
implicitly. A new identity starts maximally safe — read-only, no money, no external messages, no
production changes, no deletion — and access is evaluated **per request** under zero trust.
Deterministic. Tenant-scoped.

Module: `packages/core/src/agent-identity/`. Contracts: `packages/shared/src/contracts/agent-identity.ts`
(mirrored in `workers/`). Migrations: `0040_agent_identities.sql`, `0041_agent_identities_rls.sql`. ADR:
`docs/adr/ADR-0025-agent-identity-zero-trust.md`. Smoke: `pnpm identity:smoke`.

## What every identity carries

A unique **agent_key**, a **role**, a **scope** (what it may operate on), **capabilities** (write,
spend, external-comm, modify-production, delete — all off by default), **data boundaries** (an
allow-list of namespaces), **tool access** (an allow-list of tools), a **spending limit**, an
**external-communication daily limit**, **approval requirements** (the six sensitive classes by
default), and a **status** that can be suspended or revoked.

## The secure default

`issue()` applies the safe defaults — **read-only, no money ($0 limit), no external messages (0/day),
no production, no deletion, no tools**, with all six sensitive action classes flagged for approval. An
agent can do almost nothing until explicitly granted.

## Grants

`grant()` opens exactly what an agent should have: specific capabilities, tools, data namespaces,
scope, a spending limit, an external-comm allowance — merged onto the identity, nothing more.

## Zero-trust evaluation

`evaluate(request)` returns **allow / deny / needs_approval** per request, deny-by-default:

- unknown / non-active identity → **deny**
- read → **allow** within data boundaries
- write/spend/external/production/delete → needs the matching capability, else **deny**
- spend → also bounded by the spending limit (**deny** over the cap)
- external_comm → needs a non-zero daily allowance
- a granted action whose class is in `requires_approval_for` → **needs_approval**
- `use_tool` → the tool must be in the allow-list
- a data namespace outside the boundaries → **deny**

`suspend()` denies everything temporarily; `revoke()` is terminal.

## Complements the Security Gate

The Security Gate checks the *action*; the identity registry checks *who* is asking. Together they give
both action-level and agent-level zero trust.

## Tenant isolation

Identities are tenant-scoped and agent keys are unique per tenant, matching the RLS on
`agent_identities`.

## Wiring (Phase 2)

Phase 2 has the Agent Factory issue an identity for each generated agent and the orchestrator call
`evaluate` before dispatching any agent action.
