# ADR-0012 — Model Router & Connector Registry

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Founder

## Context
Two independence requirements: Alfy2 must **never depend on a single AI provider**, and its
integrations must be **modular and never hard-coded** so future models and connectors slot in without
code changes. Both are variations of the same principle — describe capabilities as *data* in a
registry, and let the system route over them.

## Decision
### Model Router
1. **Models are registry entries, not an enum.** A `ModelDescriptor` carries an id, provider, per-task
   capability scores (0..1), cost tier, locality, and availability. Adding a current or future model
   (Claude Code, GPT-5.5, GPT Codex, OpenClaw, local models, anything next) is appending a descriptor
   or calling `register()` — no code change.
2. **Route by task type, return a cross-provider fallback chain.** `route(task, constraints)` scores
   the registered models for one of eight task types (coding, reasoning, writing, debugging, planning,
   research, architecture, summarization), picks the best, and returns a fallback chain that **leads
   with a different provider** so a single provider's outage never blocks work. Constraints support
   `prefer_local`, `max_cost_tier`, and `require_available`.
3. **The router only decides; the AI Gateway executes.** It returns a model id; the existing AI
   Gateway (flag → cache → budget → usage) makes the call. Provider-agnostic by construction.

### Connector Registry
4. **Connectors are descriptors, not hard-coded integrations.** A `ConnectorDescriptor` has free-text
   `kind` and `category` (so arbitrary future connectors, including MCP, need no schema/code change)
   plus the operational metadata the operator needs: authentication, permissions, risk level, allowed
   actions, the businesses using it, health status, and last sync.
5. **Blueprints are convenience seeds.** Known connectors (GitHub, Gmail, Calendar, Drive, Slack,
   Discord, Stripe, Supabase, Notion, CRM, and a generic `mcp`) are blueprint *data* the registry can
   `install()` per tenant; anything else is `register()`-ed directly as a full descriptor.
6. **Tenant-scoped.** Connectors carry `tenant_id` + RLS; the registry only returns the tenant's
   connectors. (Models are universal capability data and stay global.)

## Consequences
- **Positive:** no lock-in — provider diversity is enforced in the fallback chain and proven by test;
  future models/connectors are pure data; routing is deterministic and explainable; connector metadata
  gives the operator a single view of access, risk, and health.
- **Cost:** model capability scores are curated estimates that need occasional tuning; the router is
  heuristic (score-based), not a live benchmark; connector *execution* (actually calling GitHub/Gmail)
  is out of scope here — this is the registry/metadata + routing layer.
- **Mitigation:** scores are data and trivially adjustable; a live-benchmark or learned scorer can
  replace the heuristic behind the same `route()` API; connector execution adapters plug in per `kind`
  in Phase 2 without changing the registry.

## Alternatives considered
- **Hard-code a primary provider with a manual fallback:** brittle and exactly the lock-in to avoid.
  Rejected.
- **Enumerate models/connectors in code:** every new entry would be a code change and a release.
  Rejected in favor of registry-as-data.
- **One global connector list (not tenant-scoped):** leaks cross-tenant integration state. Rejected —
  connectors are tenant installations.
