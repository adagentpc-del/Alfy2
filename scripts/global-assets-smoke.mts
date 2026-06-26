/**
 * Runtime smoke test for the Global Asset Library. Catalogs assets across many types for two
 * businesses, searches GLOBALLY (across businesses) while MAINTAINING PERMISSIONS (private + sensitive
 * gated by role), and exercises relationships, versioning, usage history, approval, and tenant
 * isolation. Run with: `tsx scripts/global-assets-smoke.mts`.
 */
import assert from "node:assert/strict";
import {
  GlobalAssetLibrary,
  PermissionChecker,
} from "@alfy2/core";
import { GrantSchema, type Grant } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const NOW = new Date("2026-06-24T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

// Roles: owner (alyssa) sees everything; viewer (intern) is restricted.
const grants: Grant[] = [
  GrantSchema.parse({ id: id(), tenant_id: TENANT, principal: "alyssa@x.com", role: "owner", created_at: NOW.toISOString() }),
  GrantSchema.parse({ id: id(), tenant_id: TENANT, principal: "intern@x.com", role: "viewer", created_at: NOW.toISOString() }),
];
const perms = new PermissionChecker(grants);

const lib = new GlobalAssetLibrary({
  clock: () => NOW,
  idFactory: id,
  roleResolver: (t, p) => perms.rolesFor(t, p),
});

// Catalog a spread of asset types across two businesses.
const deckMoveMi = lib.add(TENANT, { type: "pitch_deck", name: "Move Mi — Seed Deck", description: "Seed fundraising deck", owner: "alyssa@x.com", business_id: "move-mi", version: "2.1.0", location: "https://drive/move-mi-deck", tags: ["fundraising", "deck"], visibility: "business" });
const deckCrowning = lib.add(TENANT, { type: "sales_deck", name: "Crowning — Sales Deck", description: "Coaching sales deck", owner: "alyssa@x.com", business_id: "crowning", version: "1.0.0", location: "https://drive/crowning-deck", tags: ["sales", "deck"], visibility: "business" });
const logo = lib.add(TENANT, { type: "logo", name: "Move Mi Logo", description: "Primary logo SVG", owner: "alyssa@x.com", business_id: "move-mi", location: "https://drive/move-mi-logo.svg", tags: ["brand"] });
const sop = lib.add(TENANT, { type: "sop", name: "Onboarding SOP", description: "How crews onboard", owner: "alyssa@x.com", business_id: "move-mi", location: "https://notion/sop", tags: ["ops"] });
const apiKey = lib.add(TENANT, { type: "api_key", name: "Stripe live key", description: "Production Stripe key reference", owner: "alyssa@x.com", business_id: "move-mi", location: "secret://stripe/live", sensitive: true, visibility: "business", tags: ["payments"] });
const privateNote = lib.add(TENANT, { type: "customer_list", name: "VIP customer list", description: "Top accounts", owner: "alyssa@x.com", business_id: "move-mi", location: "secret://crm/vip", visibility: "private", tags: ["customers"] });

// Every asset carries the required metadata fields.
for (const a of [deckMoveMi, logo, apiKey]) {
  for (const f of ["owner", "business_id", "version", "relationships", "tags", "status", "approval", "location", "usage_history", "keywords"]) {
    assert.ok(f in a, `asset has ${f}`);
  }
}

// --- GLOBAL search (across businesses) ---
const decks = lib.search(TENANT, { principal: "alyssa@x.com", text: "deck" });
const deckBiz = new Set(decks.map((h) => h.business_id));
assert.ok(deckBiz.has("move-mi") && deckBiz.has("crowning"), "search spans businesses globally");
assert.ok(decks[0]!.score > 0, "ranked by relevance");

// --- MAINTAIN permissions ---
// Owner sees the sensitive API key and the private list.
assert.ok(lib.get(TENANT, apiKey.id, "alyssa@x.com"), "owner can see sensitive api_key");
assert.ok(lib.get(TENANT, privateNote.id, "alyssa@x.com"), "owner can see the private list");
// Viewer cannot.
assert.equal(lib.get(TENANT, apiKey.id, "intern@x.com"), null, "viewer CANNOT see sensitive api_key");
assert.equal(lib.get(TENANT, privateNote.id, "intern@x.com"), null, "viewer CANNOT see private asset");
// Viewer CAN see normal business assets.
assert.ok(lib.get(TENANT, deckMoveMi.id, "intern@x.com"), "viewer can see a normal deck");
// And search reflects it: the viewer's results never include the sensitive/private assets.
const internAll = lib.search(TENANT, { principal: "intern@x.com", text: "" , limit: 100 });
const internIds = new Set(internAll.map((h) => h.asset_id));
assert.ok(!internIds.has(apiKey.id) && !internIds.has(privateNote.id), "global search hides gated assets from the viewer");
assert.ok(internIds.has(sop.id), "but shows permitted assets");

// --- relationships, versioning, usage, approval ---
lib.link(TENANT, deckMoveMi.id, "derived_from", deckCrowning.id);
assert.ok(lib.get(TENANT, deckMoveMi.id, "alyssa@x.com")!.relationships.some((r) => r.target_asset_id === deckCrowning.id), "relationship recorded");

const v3 = lib.update(TENANT, deckMoveMi.id, { version: "3.0.0", status: "active" });
assert.equal(v3.version, "3.0.0", "version updated");
assert.ok(v3.updated_at, "updated_at set");

lib.recordUsage(TENANT, deckMoveMi.id, { actor: "alyssa@x.com", action: "sent" });
assert.equal(lib.get(TENANT, deckMoveMi.id, "alyssa@x.com")!.usage_history.length, 1, "usage history appended");

const approved = lib.approve(TENANT, sop.id, "alyssa@x.com");
assert.equal(approved.approval, "approved", "asset approved");

// --- filters ---
assert.ok(lib.search(TENANT, { principal: "alyssa@x.com", types: ["logo"] }).every((h) => h.type === "logo"), "type filter");
assert.ok(lib.byBusiness(TENANT, "crowning", "alyssa@x.com").every((a) => a.business_id === "crowning"), "byBusiness scoped");

// --- tenant isolation ---
assert.equal(lib.search("00000000-0000-0000-0000-0000000000ff", { principal: "alyssa@x.com", text: "deck" }).length, 0, "another tenant sees nothing");

console.log("GLOBAL ASSET LIBRARY SMOKE OK — global search across businesses, permissions maintained (sensitive/private gated), relationships/version/usage/approval");
console.log("decks found:", JSON.stringify(decks.map((d) => `${d.name} [${d.business_id}] ${d.score}`), null, 0));
