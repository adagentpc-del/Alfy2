/**
 * Runtime smoke test for Opportunity Intelligence. Proves: the engine relates entities across the ten
 * sources and surfaces the four canonical opportunities ("this developer also fits Divini Procure",
 * "this investor should meet this project", "this GitHub repo solves Move Mi", "this vendor should be
 * introduced to this developer"); every opportunity is scored on revenue/probability/effort/risk/
 * strategic value with a composite; opportunities are ranked; surfacing is automatic; accept/dismiss
 * transitions work; re-analysis dedupes (no duplicates, decisions preserved); and tenant isolation.
 * Run with: `tsx scripts/opportunity-intelligence-smoke.mts`.
 */
import assert from "node:assert/strict";
import { OpportunityEngine } from "@alfy2/core";
import { AnalyzeInputSchema, type EntityRef } from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-25T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const engine = new OpportunityEngine({ clock: () => NOW, idFactory: id });

const e = (over: Partial<EntityRef> & Pick<EntityRef, "ref_id" | "kind" | "name">): EntityRef => ({
  business_id: null,
  tags: [],
  keywords: [],
  attributes: {},
  ...over,
});

// A corpus spanning the ten entity kinds.
const entities: EntityRef[] = [
  e({ ref_id: "contact:rivera", kind: "contact", name: "Sam Rivera", keywords: ["procurement", "supply chain", "backend"], attributes: { role: "developer" } }),
  e({ ref_id: "biz:divini-procure", kind: "business", name: "Divini Procure", business_id: "00000000-0000-0000-0000-0000000000dd", keywords: ["procurement", "supply chain", "vendor", "bidding"], attributes: { sector: "procurement", revenue_potential: "high" } }),
  e({ ref_id: "repo:route-optimizer", kind: "github_repo", name: "route-optimizer", keywords: ["routing", "logistics", "dispatch", "optimization"], attributes: { verdict: "safe" } }),
  e({ ref_id: "biz:move-mi", kind: "business", name: "Move Mi", business_id: "00000000-0000-0000-0000-0000000000aa", keywords: ["moving", "logistics", "dispatch", "routing"], attributes: { sector: "logistics", revenue_potential: "high" } }),
  e({ ref_id: "investor:falcon", kind: "investor", name: "Falcon Capital", keywords: ["logistics", "marketplace", "seed"], attributes: { sector: "logistics" } }),
  e({ ref_id: "idea:strata-hq", kind: "idea", name: "Strata HQ", keywords: ["logistics", "marketplace", "wellness"], attributes: { revenue_potential: "high" } }),
  e({ ref_id: "vendor:signco", kind: "vendor", name: "SignCo Fabrication", keywords: ["backend", "api", "integration"] }),
  e({ ref_id: "asset:crm-automation", kind: "asset", name: "CRM automation", keywords: ["procurement", "automation"] }),
  e({ ref_id: "trend:nearshoring", kind: "market_trend", name: "nearshoring", keywords: ["supply chain", "procurement"] }),
  e({ ref_id: "client:acme", kind: "client", name: "Acme Corp", keywords: ["logistics", "moving"] }),
];

// === 1. Analyze relates entities and surfaces the four canonical opportunities. ===
const opps = engine.analyze(TENANT, AnalyzeInputSchema.parse({ entities }));
assert.ok(opps.length >= 4, `expected several opportunities, got ${opps.length}`);
const titles = opps.map((o) => o.title);
assert.ok(titles.some((t) => /developer also fits Divini Procure/i.test(t)), "developer-fits-business found");
assert.ok(titles.some((t) => /GitHub repo solves Move Mi/i.test(t)), "repo-solves-business found");
assert.ok(titles.some((t) => /investor should meet/i.test(t)), "investor-meets-project found");
assert.ok(titles.some((t) => /vendor should be introduced to this developer/i.test(t)), "vendor-intro-developer found");
console.log("[1] relates entities → the four canonical opportunities surface ✔");

// === 2. Every opportunity is scored on the five dimensions + a composite. ===
for (const o of opps) {
  for (const k of ["revenue", "probability", "effort", "risk", "strategic_value", "composite"] as const) {
    const v = o.scores[k];
    assert.ok(v >= 0 && v <= 1, `${k} in range for "${o.title}"`);
  }
  assert.ok(o.recommended_action.length > 0 && o.rationale.length > 0, "has action + rationale");
}
console.log("[2] every opportunity scored: revenue/probability/effort/risk/strategic_value + composite ✔");

// === 3. Ranked by composite (descending). ===
for (let i = 1; i < opps.length; i += 1) {
  assert.ok(opps[i - 1]!.scores.composite >= opps[i]!.scores.composite, "ranked desc by composite");
}
console.log(`[3] ranked by composite (top: "${opps[0]!.title}" @ ${opps[0]!.scores.composite}) ✔`);

// === 4. Automatic surfacing of the strongest opportunities. ===
const surfaced = engine.surface(TENANT, 0.5);
assert.ok(surfaced.length >= 1, "surfaced the strong ones");
assert.ok(surfaced.every((o) => o.scores.composite >= 0.5), "only above-threshold surfaced");
assert.ok(surfaced.every((o) => o.status === "surfaced"), "marked surfaced");
console.log(`[4] automatic surfacing: ${surfaced.length} opportunities above threshold ✔`);

// === 5. Accept / dismiss transitions. ===
const accepted = engine.accept(TENANT, surfaced[0]!.id);
assert.equal(accepted.status, "accepted");
const dismissed = engine.dismiss(TENANT, surfaced[surfaced.length - 1]!.id);
assert.equal(dismissed.status, "dismissed");
assert.ok(!engine.top(TENANT, 50).some((o) => o.id === dismissed.id), "dismissed drops out of top");
console.log("[5] accept / dismiss transitions ✔");

// === 6. Re-analysis dedupes and preserves decisions. ===
const before = engine.list(TENANT).length;
const rerun = engine.analyze(TENANT, AnalyzeInputSchema.parse({ entities }));
assert.equal(engine.list(TENANT).length, before, "re-analysis does not duplicate");
assert.equal(engine.get(TENANT, accepted.id)!.status, "accepted", "prior decision preserved across re-analysis");
assert.ok(rerun.length >= 4, "re-analysis still returns the opportunities");
console.log("[6] re-analysis dedupes by signature; decisions preserved ✔");

// === 7. Tenant isolation. ===
assert.equal(engine.list(OTHER).length, 0, "no cross-tenant opportunities");
assert.equal(engine.get(OTHER, accepted.id), undefined, "no cross-tenant read");
console.log("[7] tenant isolation ✔");

console.log(
  "\nOPPORTUNITY INTELLIGENCE SMOKE OK — relates entities across the 10 sources, surfaces the canonical opportunities (developer↔business fit, repo↔business solves, investor↔project, vendor↔developer intro), scores every one on revenue/probability/effort/risk/strategic-value + composite, ranks them, surfaces the strongest automatically, supports accept/dismiss, dedupes on re-analysis while preserving decisions, tenant-isolated.",
);
