/**
 * Runtime smoke for the Expert Knowledge Council + Framework Library engine.
 *
 * Proves the council works deterministically:
 *   - seedExpertLibrary seeds ≥ 12 frameworks across multiple lenses
 *   - selectLenses picks ≥ 2 relevant lenses for a Move Mi referral campaign
 *   - applyLenses produces one recommendation per selected lens + a chosen_strategy
 *   - runAdvisoryBoard on a pricing decision returns multiple lens views + tradeoffs
 *   - convertPrinciple turns the Hormozi value principle into templates / SOPs / kpi
 *   - setTestStatus promotes a framework to validated
 *
 * Deterministic (injected clock + idFactory). Run with: `tsx scripts/expert-council-smoke.mts`.
 */
import assert from "node:assert/strict";
import { ExpertCouncilEngine, DEFAULT_FRAMEWORKS } from "@alfy2/core";

const TENANT = "00000000-0000-0000-0000-0000000000ec";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const idFactory = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;

const engine = new ExpertCouncilEngine({ clock: () => NOW, idFactory });

// === 1. Seed the library: ≥ 12 frameworks across multiple lenses. ===
const seeded = engine.seedExpertLibrary(TENANT);
assert.ok(seeded.length >= 12, `expected ≥ 12 seeded frameworks, got ${seeded.length}`);
assert.equal(seeded.length, DEFAULT_FRAMEWORKS.length, "every default framework should seed on a fresh tenant");
const disciplines = new Set(seeded.map((f) => f.discipline));
assert.ok(disciplines.size >= 5, `expected frameworks across ≥ 5 lenses, got ${disciplines.size}`);
assert.ok(disciplines.has("offer_pricing") && disciplines.has("wealth_investing") && disciplines.has("nonprofit_fundraising"));
assert.ok(seeded.every((f) => f.test_status === "untested"));

// Idempotent: re-seeding the same tenant adds nothing.
assert.equal(engine.seedExpertLibrary(TENANT).length, 0, "re-seed should be a no-op");
assert.ok(engine.listFrameworks(TENANT).length >= 12);

// === 2. selectLenses for a Move Mi referral campaign → ≥ 2 lenses. ===
const lenses = engine.selectLenses("create a Move Mi referral campaign");
assert.ok(lenses.length >= 2, `expected ≥ 2 lenses, got ${lenses.length}`);
assert.ok(lenses.includes("marketing_attention"), "a referral campaign should select the marketing/attention lens");

// === 3. applyLenses → one recommendation per selected lens + a chosen_strategy. ===
const application = engine.applyLenses(TENANT, {
  objective: "create a Move Mi referral campaign",
  business_key: "move_mi",
});
assert.equal(
  application.recommendations.length,
  application.selected_lenses.length,
  "one recommendation per selected lens",
);
assert.ok(application.recommendations.length >= 2);
assert.deepEqual(
  application.recommendations.map((r) => r.lens),
  application.selected_lenses,
  "recommendation lenses align with selected lenses",
);
assert.ok(application.chosen_strategy.length > 0, "a chosen_strategy must be produced");
assert.ok(application.kpis.length === application.selected_lenses.length);

// === 4. runAdvisoryBoard on a pricing decision → multiple lens views + tradeoffs. ===
const review = engine.runAdvisoryBoard(TENANT, {
  decision: "raise Move Mi pricing by 20%",
  business_key: "move_mi",
});
assert.ok(review.lenses_run.length >= 5, `expected multiple board lens views, got ${review.lenses_run.length}`);
assert.ok(review.lenses_run.some((l) => l.lens_name === "Revenue"));
assert.ok(review.lenses_run.some((l) => l.lens_name === "Risk"));
assert.ok(review.tradeoffs.length >= 2, "board review must surface tradeoffs");
assert.ok(review.fastest_safe_next_step.length > 0);
// Money is involved → Alyssa approval is required.
assert.match(review.decision_required, /approval/i);

// === 5. convertPrinciple → templates / SOPs / kpi for execution. ===
const conversion = engine.convertPrinciple(TENANT, {
  principle: "make the offer so good they feel stupid saying no",
  business_key: "move_mi",
});
assert.ok(conversion.templates_needed.length > 0, "conversion must produce templates");
assert.ok(conversion.sops_needed.length > 0, "conversion must produce SOPs");
assert.ok(conversion.kpi.length > 0, "conversion must name a KPI");
assert.ok(conversion.departments.length > 0 && conversion.agents.length > 0);
assert.ok(conversion.recommended_test.length > 0);
assert.deepEqual(conversion.businesses, ["move_mi"]);

// === 6. setTestStatus → validated. ===
const target = seeded[0]!;
const promoted = engine.setTestStatus(TENANT, target.id, "validated");
assert.equal(promoted.test_status, "validated");
assert.equal(engine.listFrameworks(TENANT, { test_status: "validated" }).length, 1);

// === 7. whatWouldTheGreatsDo → adapted (NOT imitative) recommendations. ===
const greats = engine.whatWouldTheGreatsDo(TENANT, {
  objective: "design an irresistible offer for Move Mi",
  business_key: "move_mi",
});
assert.ok(greats.recommendations.length >= 2);
assert.match(greats.chosen_strategy, /adapt/i);
assert.ok(greats.recommendations.some((r) => /adapt/i.test(r.recommendation)));

console.log(
  `EXPERT COUNCIL SMOKE OK — seeded ${seeded.length} frameworks across ${disciplines.size} lenses; ` +
    `applied ${application.selected_lenses.length} lenses with chosen strategy; ` +
    `advisory board ran ${review.lenses_run.length} lenses; principle converted to ` +
    `${conversion.templates_needed.length} templates + ${conversion.sops_needed.length} SOPs; ` +
    `framework promoted to validated.`,
);
