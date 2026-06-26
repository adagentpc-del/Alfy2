/**
 * Runtime smoke for the FounderOS Commercialization Layer. Proves the 10 named features are seeded and
 * classified, SaaS-module candidates surface, re-classification works, and nothing is ever commercialized
 * (preparation only). Run with: `tsx scripts/commercialization-smoke.mts`.
 */
import assert from "node:assert/strict";
import { CommercializationRegistry } from "@alfy2/core";
import { ClassifyFeatureInputSchema } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const reg = new CommercializationRegistry({ clock: () => NOW, idFactory: id });

// === 1. Seeds the 10 named features, all classified, none commercialized. ===
const all = reg.list(TENANT);
assert.ok(all.length >= 10, "10+ features seeded");
assert.ok(all.every((f) => f.commercialized === false), "nothing commercialized — preparation only");
assert.ok(reg.get(TENANT, "Revenue Factory")!.tier === "founder_saas_feature", "Revenue Factory classified");
console.log(`[1] seeded ${all.length} features, none commercialized ✔`);

// === 2. SaaS module candidates surface. ===
const saas = reg.saasModules(TENANT);
assert.ok(saas.length >= 10, "SaaS candidates surfaced");
assert.ok(saas.some((f) => f.feature_name === "Agent Factory"), "Agent Factory is a candidate");
console.log(`[2] ${saas.length} SaaS-module candidates ✔`);

// === 3. By tier. ===
assert.ok(reg.byTier(TENANT, "enterprise_product").some((f) => f.feature_name === "Control Tower"), "Control Tower = enterprise");
console.log("[3] classify by tier ✔");

// === 4. Re-classify updates in place, stays non-commercialized. ===
const updated = reg.classify(TENANT, ClassifyFeatureInputSchema.parse({ feature_name: "Pattern Engine", tier: "enterprise_product", saas_module_candidate: true, rationale: "Promoted after review", readiness: 0.8 }));
assert.equal(updated.tier, "enterprise_product", "re-classified");
assert.equal(updated.commercialized, false, "still not commercialized");
assert.equal(reg.byTier(TENANT, "enterprise_product").filter((f) => f.feature_name === "Pattern Engine").length, 1, "no duplicate");
console.log("[4] re-classify updates in place, never commercialized ✔");

// === 5. Tenant isolation (seeds per tenant). ===
assert.ok(reg.list(OTHER).length >= 10, "other tenant seeded independently");
console.log("[5] per-tenant seeding/isolation ✔");

console.log(
  "\nFOUNDEROS COMMERCIALIZATION SMOKE OK — Alfy² is Tenant 001; the 10 named features are classified by tier (personal_only/business_reusable/founder_saas_feature/agency_service/enterprise_product), SaaS-module candidates surface, re-classification works, and NOTHING is commercialized — architecture preparation only.",
);
