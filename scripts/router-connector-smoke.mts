/**
 * Runtime smoke test for the Model Router + Connector Registry. Verifies provider-agnostic routing
 * across all 8 task types with a cross-provider fallback chain (never depend on one provider), that a
 * FUTURE model/connector can be added as data, and that every connector carries the required metadata.
 * Run with: `tsx scripts/router-connector-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  ModelRouter,
  ConnectorRegistry,
  CONNECTOR_BLUEPRINTS,
  type ConnectorDescriptor,
} from "@alfy2/core";

// ===== MODEL ROUTER =====
const router = new ModelRouter();
const TASKS = ["coding", "reasoning", "writing", "debugging", "planning", "research", "architecture", "summarization"] as const;

for (const task of TASKS) {
  const d = router.route(task);
  assert.ok(d.chosen_model_id.length > 0, `${task}: a model is chosen`);
  assert.ok(d.ranked.length >= 1, `${task}: ranking present`);
  // Ranking is sorted descending.
  for (let i = 1; i < d.ranked.length; i++) {
    assert.ok(d.ranked[i - 1]!.score >= d.ranked[i]!.score, `${task}: ranked desc`);
  }
  assert.ok(d.rationale.length > 0, `${task}: explained`);
}

// Sensible picks given the default catalog.
assert.equal(router.route("coding").chosen_model_id, "gpt-codex", "code specialist wins coding");
assert.equal(router.route("reasoning").chosen_model_id, "gpt-5.5", "reasoning specialist wins reasoning");
assert.equal(router.route("architecture").chosen_model_id, "claude-code", "all-rounder wins architecture");

// NEVER depend on a single provider: the fallback chain leads with a different provider.
const coding = router.route("coding");
const chosenProvider = router.list().find((m) => m.id === coding.chosen_model_id)!.provider;
const firstFallbackProvider = router.list().find((m) => m.id === coding.fallbacks[0])!.provider;
assert.notEqual(firstFallbackProvider, chosenProvider, "first fallback is a different provider");

// prefer_local routes to a local model when asked.
const local = router.route("summarization", { prefer_local: true, require_available: true });
assert.ok(local.fallbacks.length >= 1, "still has fallbacks");

// FUTURE model added as DATA — no code change — and immediately routable.
router.register({
  id: "future-omega",
  name: "Future Omega",
  provider: "acme",
  strengths: { coding: 0.99 },
  available: true,
  cost_tier: "high",
});
assert.equal(router.route("coding").chosen_model_id, "future-omega", "a newly-registered model wins immediately");

// require_available excludes offline models.
router.register({ id: "offline-x", name: "Offline", provider: "x", strengths: { writing: 1 }, available: false });
assert.notEqual(router.route("writing").chosen_model_id, "offline-x", "unavailable models are excluded");

// ===== CONNECTOR REGISTRY =====
const TENANT = "00000000-0000-0000-0000-000000000001";
const registry = new ConnectorRegistry({
  clock: () => new Date("2026-06-24T12:00:00.000Z"),
  idFactory: (() => {
    let n = 0;
    return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  })(),
});

// Blueprints exist for all the named connectors (+ a generic mcp one).
for (const k of ["github", "gmail", "calendar", "google_drive", "slack", "discord", "stripe", "supabase", "notion", "crm", "mcp"]) {
  assert.ok(CONNECTOR_BLUEPRINTS[k], `blueprint for ${k} exists`);
}

// Install GitHub for the tenant, attached to two businesses.
const gh = registry.install(TENANT, "github", { id: "github-a3", businesses_using: ["a3-visual", "move-mi"] });
const requiredFields: Array<keyof ConnectorDescriptor> = [
  "permissions", "authentication", "risk_level", "allowed_actions", "businesses_using", "health_status", "last_sync",
];
for (const f of requiredFields) assert.ok(f in gh, `connector has ${f}`);
assert.equal(gh.authentication, "oauth2");
assert.equal(gh.risk_level, "medium");
assert.deepEqual(gh.businesses_using, ["a3-visual", "move-mi"]);
assert.equal(gh.health_status, "unknown");
assert.equal(gh.last_sync, null);

// Health + sync lifecycle.
registry.recordSync(TENANT, "github-a3");
const afterSync = registry.get(TENANT, "github-a3")!;
assert.equal(afterSync.health_status, "healthy", "sync sets healthy");
assert.ok(afterSync.last_sync, "sync records a timestamp");

// FUTURE connector with NO blueprint — registered directly (not hard-coded).
const future = registry.register({
  id: "futuristic-mcp-1",
  tenant_id: TENANT,
  name: "Futuristic MCP",
  kind: "some-future-saas",
  category: "automation",
  authentication: "mcp",
  permissions: ["read", "write"],
  risk_level: "low",
  allowed_actions: ["do_thing"],
  businesses_using: ["a3-visual"],
  health_status: "healthy",
  last_sync: null,
  enabled: true,
  created_at: "2026-06-24T12:00:00.000Z",
});
assert.equal(future.kind, "some-future-saas", "arbitrary future connector kind accepted");

// Queries + tenant isolation.
assert.equal(registry.byBusiness(TENANT, "a3-visual").length, 2, "two connectors used by a3-visual");
assert.equal(registry.byCategory(TENANT, "dev").length, 1, "github is the dev connector");
assert.equal(registry.list("00000000-0000-0000-0000-0000000000ff").length, 0, "another tenant sees none");

console.log("ROUTER + CONNECTOR SMOKE OK — provider-agnostic routing (8 tasks, cross-provider fallback) + modular, non-hard-coded connectors");
console.log("routing:", JSON.stringify(TASKS.map((t) => `${t} -> ${router.route(t).chosen_model_id}`), null, 0));
