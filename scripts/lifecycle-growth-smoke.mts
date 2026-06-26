/**
 * Runtime smoke for the Lifecycle + Growth Architecture engine. Proves: designLifecycle scaffolds
 * all 8 stages in canonical order; designGrowthLoop persists a referral loop; auditTrustAssets
 * records the trust flywheel; auditFirstImpression scores the 8 checks (score < 1 + recommendations
 * when some fail); designWhiteGloveJourney persists a journey; tenant isolation holds.
 * Deterministic. Run with: `tsx scripts/lifecycle-growth-smoke.mts`.
 */
import assert from "node:assert/strict";
import { LifecycleGrowthEngine } from "@alfy2/core";
import {
  LIFECYCLE_STAGE_ORDER,
  DesignGrowthLoopInputSchema,
  AuditTrustAssetsInputSchema,
  AuditFirstImpressionInputSchema,
  DesignWhiteGloveJourneyInputSchema,
} from "@alfy2/shared";

const TENANT = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = new Date("2026-06-26T12:00:00.000Z");
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const engine = new LifecycleGrowthEngine({ clock: () => NOW, idFactory: id });

// === 1. designLifecycle scaffolds all 8 stages in canonical order. ===
const map = engine.designLifecycle(TENANT, { business_key: "move_mi", stakeholder: "customer" });
assert.equal(map.stages.length, 8, "8 lifecycle stages");
assert.deepEqual(map.stages.map((s) => s.stage), [...LIFECYCLE_STAGE_ORDER], "stages in canonical order");
assert.equal(map.stages[0]!.stage, "attention");
assert.equal(map.stages[7]!.stage, "advocacy");
console.log("[1] designLifecycle(move_mi/customer) → 8 stages in order ✔");

// === 2. designGrowthLoop — a referral loop. ===
const loop = engine.designGrowthLoop(
  TENANT,
  DesignGrowthLoopInputSchema.parse({
    business_key: "move_mi",
    name: "Movers Refer Movers",
    kind: "referral",
    steps: [
      {
        trigger: "completed move",
        participant: "happy customer",
        action: "shares referral link",
        reward_value: "$50 credit each side",
        metric: "referral conversion rate",
        friction: "remembering to share",
        automation: "post-move SMS with prefilled link",
        failure_point: "no incentive surfaced",
      },
    ],
    improvement_plan: "A/B test reward size and SMS timing",
  }),
);
assert.equal(loop.kind, "referral");
assert.equal(loop.steps.length, 1);
assert.equal(engine.listGrowthLoops(TENANT, { kind: "referral" }).length, 1, "referral loop listed");
assert.equal(engine.listGrowthLoops(TENANT, { kind: "content" }).length, 0, "no content loops");
console.log("[2] designGrowthLoop → referral loop persisted + filterable ✔");

// === 3. auditTrustAssets — the trust flywheel. ===
const trust = engine.auditTrustAssets(
  TENANT,
  AuditTrustAssetsInputSchema.parse({
    business_key: "move_mi",
    existing_assets: ["Google reviews", "before/after photos"],
    missing_assets: ["video testimonials", "insurance badge"],
    easiest_to_create: "insurance badge",
    highest_value_proof: "video testimonials",
    trust_blockers: ["no visible pricing"],
    reputation_risks: ["unanswered 1-star review"],
    next_action: "film 3 customer video testimonials",
  }),
);
assert.equal(trust.missing_assets.length, 2);
assert.equal(trust.highest_value_proof, "video testimonials");
assert.equal(engine.listTrustAssetAudits(TENANT, "move_mi").length, 1);
console.log("[3] auditTrustAssets → trust flywheel audit recorded ✔");

// === 4. auditFirstImpression — some checks fail → score < 1 + recommendations. ===
const fi = engine.auditFirstImpression(
  TENANT,
  AuditFirstImpressionInputSchema.parse({
    business_key: "move_mi",
    touchpoint: "landing_page",
    sets_expectations: true,
    reduces_anxiety: false, // fail
    explains_value: true,
    attracts_right: true,
    repels_wrong: false, // fail
    credible: false, // fail
    creates_next_action: true,
    matches_brand: true,
  }),
);
assert.ok(fi.score < 1, "score < 1 when checks fail");
assert.equal(fi.score, 5 / 8, "score = passing fraction (5/8)");
assert.equal(fi.recommendations.length, 3, "one recommendation per failing check");
assert.ok(fi.recommendations.some((r) => r.includes("credibility")), "recommends adding credibility/proof");
console.log(`[4] auditFirstImpression → score=${fi.score.toFixed(3)} (<1), ${fi.recommendations.length} recommendations ✔`);

// A perfect audit scores 1.0 with no recommendations.
const perfect = engine.auditFirstImpression(
  TENANT,
  AuditFirstImpressionInputSchema.parse({
    business_key: "move_mi",
    touchpoint: "signup_flow",
    sets_expectations: true,
    reduces_anxiety: true,
    explains_value: true,
    attracts_right: true,
    repels_wrong: true,
    credible: true,
    creates_next_action: true,
    matches_brand: true,
  }),
);
assert.equal(perfect.score, 1, "all checks pass → score 1");
assert.equal(perfect.recommendations.length, 0, "no recommendations when perfect");
console.log("[4b] perfect first impression → score=1, 0 recommendations ✔");

// === 5. designWhiteGloveJourney. ===
const journey = engine.designWhiteGloveJourney(
  TENANT,
  DesignWhiteGloveJourneyInputSchema.parse({
    business_key: "move_mi",
    stakeholder: "customer",
    stages: [
      {
        stage_name: "booking confirmation",
        objective: "reassure the move is handled",
        pain_addressed: "moving anxiety",
        communication: "personal call within 1 hour",
        asset: "welcome packet PDF",
        owner: "concierge agent",
        kpi: "confirmation call rate",
        failure_signal: "no contact within 24h",
        improvement: "auto-dial on booking",
      },
    ],
  }),
);
assert.equal(journey.stages.length, 1);
assert.equal(journey.stakeholder, "customer");
assert.equal(engine.listWhiteGloveJourneys(TENANT, "move_mi").length, 1);
console.log("[5] designWhiteGloveJourney → journey persisted ✔");

// === 6. Tenant isolation. ===
assert.equal(engine.listLifecycles(OTHER).length, 0, "no cross-tenant lifecycles");
assert.equal(engine.listGrowthLoops(OTHER).length, 0, "no cross-tenant growth loops");
assert.equal(engine.listFirstImpressionAudits(OTHER).length, 0, "no cross-tenant first-impression audits");
console.log("[6] tenant isolation ✔");

console.log(
  "\nLIFECYCLE + GROWTH SMOKE OK — designLifecycle scaffolds all 8 stages in order (attention→advocacy), referral growth loop persisted + filterable, trust-asset audit recorded, first-impression audit scored (5/8 with 3 recommendations; perfect=1.0/0), white-glove journey designed, and tenant isolation holds.",
);
